#!/usr/bin/env bash
set -euo pipefail
[[ ${EUID} -eq 0 ]] || { echo 'Run with sudo: sudo bash deploy/rollback.sh /var/backups/qianianxy/RELEASE_ID' >&2; exit 1; }
BACKUP="${1:?Provide the backup directory printed by deploy.sh}"
BACKUP="$(realpath "$BACKUP")"
[[ "$BACKUP" == /var/backups/qianianxy/* && -f "$BACKUP/nginx.conf" && -f "$BACKUP/previous-target" ]] || { echo 'Invalid backup' >&2; exit 1; }
CONF=/etc/nginx/sites-available/qianianxy.cn
CURRENT=/var/www/qianianxy-current
TARGET="$(cat "$BACKUP/previous-target")"
[[ -d "$TARGET" ]] || { echo 'Previous release directory is missing' >&2; exit 1; }
TMP="$(mktemp -d /var/backups/qianianxy/rollback-XXXXXX)"
cp -a "$CONF" "$TMP/nginx.conf"
readlink -f "$CURRENT" > "$TMP/current-target"
restore_failed_rollback() {
  status=$?
  cp -a "$TMP/nginx.conf" "$CONF"
  ln -s "$(cat "$TMP/current-target")" "$CURRENT.restore-$$"
  mv -Tf "$CURRENT.restore-$$" "$CURRENT"
  nginx -t && systemctl reload nginx
  exit "$status"
}
trap restore_failed_rollback ERR
ln -s "$TARGET" "$CURRENT.rollback-$$"
mv -Tf "$CURRENT.rollback-$$" "$CURRENT"
cp -a "$BACKUP/nginx.conf" "$CONF"
nginx -t
systemctl reload nginx
trap - ERR
printf 'Restored previous configuration and release: %s\n' "$TARGET"
