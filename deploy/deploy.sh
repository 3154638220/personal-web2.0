#!/usr/bin/env bash
set -euo pipefail
[[ ${EUID} -eq 0 ]] || { echo 'Run with sudo: sudo bash deploy/deploy.sh' >&2; exit 1; }
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
CONF=/etc/nginx/sites-available/qianianxy.cn
CURRENT=/var/www/qianianxy-current
STAMP="$(date -u +%Y%m%dT%H%M%SZ)-$$"
RELEASE="/var/www/qianianxy-releases/$STAMP"
BACKUP="/var/backups/qianianxy/$STAMP"
node "$PROJECT/scripts/check.js"
nginx -t
mkdir -p "$BACKUP/site" "$RELEASE"
cp -a "$CONF" "$BACKUP/nginx.conf"
if [[ -L "$CURRENT" ]]; then
  readlink -f "$CURRENT" > "$BACKUP/previous-target"
else
  printf '%s\n' /var/www/qianianxy.cn > "$BACKUP/previous-target"
fi
cp -a "$(cat "$BACKUP/previous-target")/." "$BACKUP/site/"
rsync -a --delete "$PROJECT/dist/" "$RELEASE/"
chown -R www-data:www-data "$RELEASE"
find "$RELEASE" -type d -exec chmod 755 {} +
find "$RELEASE" -type f -exec chmod 644 {} +
# Keep content-addressed assets from the prior version for already-open pages.
if [[ -d "$CURRENT/assets" ]]; then rsync -a --ignore-existing "$CURRENT/assets/" "$RELEASE/assets/"; fi
SWITCHED=0
recover() {
  code=$?
  if [[ $SWITCHED -eq 1 ]]; then
    echo 'Deployment failed; restoring previous release and Nginx configuration.' >&2
    cp -a "$BACKUP/nginx.conf" "$CONF"
    ln -s "$(cat "$BACKUP/previous-target")" "$CURRENT.rollback-$$"
    mv -Tf "$CURRENT.rollback-$$" "$CURRENT"
    nginx -t && systemctl reload nginx
  fi
  exit "$code"
}
trap recover ERR
# Stage config before switching. Only the content root changes; ACME stays put.
python3 - "$CONF" "$BACKUP/nginx.next.conf" <<'PY'
import pathlib,sys
source=pathlib.Path(sys.argv[1]).read_text()
old='\n    root /var/www/qianianxy.cn;'
new='\n    root /var/www/qianianxy-current;'
if old not in source and new not in source: raise SystemExit('Unexpected Nginx content root; refusing to edit configuration')
source=source.replace(old,new)
source=source.replace('    location / {\n        try_files $uri $uri/ =404;','    location / {\n        add_header Cache-Control "no-cache";\n        try_files $uri $uri/ =404;')
pathlib.Path(sys.argv[2]).write_text(source)
PY
ln -s "$RELEASE" "$CURRENT.next-$$"
SWITCHED=1
mv -Tf "$CURRENT.next-$$" "$CURRENT"
cp "$BACKUP/nginx.next.conf" "$CONF"
nginx -t
systemctl reload nginx
# Verify this machine's real TLS virtual host without depending on DNS.
BASE=https://www.qianianxy.cn
CURL=(curl --silent --show-error --max-time 20 --resolve www.qianianxy.cn:443:127.0.0.1)
# A reload is asynchronous: an old worker can accept the first new connection.
READY=0
for attempt in {1..20}; do
  if "${CURL[@]}" --fail "$BASE/" > "$BACKUP/live-home.html" && python3 - "$BACKUP/live-home.html" <<'PY'
from pathlib import Path
import sys
sys.exit(0 if 'QNXY / FIELD NOTES' in Path(sys.argv[1]).read_text() else 1)
PY
  then
    READY=1
    break
  fi
  sleep 0.25
done
[[ $READY -eq 1 ]] || { echo 'New home page did not become healthy after reload' >&2; false; }
"${CURL[@]}" --fail "$BASE/posts.json" > "$BACKUP/live-posts.json"
python3 - "$BACKUP/live-posts.json" "$PROJECT/dist/posts.json" <<'PY'
import json,sys
posts=json.load(open(sys.argv[1]))
assert posts==json.load(open(sys.argv[2]))
PY
"${CURL[@]}" --fail "$BASE/articles/KMP.html" >/dev/null
[[ "$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE/articles/question-resource.html")" == 404 ]]
[[ "$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE/does-not-exist")" == 404 ]]
trap - ERR
printf 'Deployed: %s\nRelease: %s\nBackup: %s\nRollback: sudo bash %s/deploy/rollback.sh %s\n' "$BASE" "$RELEASE" "$BACKUP" "$PROJECT" "$BACKUP"
