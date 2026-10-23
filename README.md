# qnxy · 个人网站 2.0

纸色编辑风格 × 森林绿数学图版。原生 HTML/CSS/JavaScript、Node 静态构建、Nginx 托管。
默认中文和浅色；支持中英界面、深色主题、全文搜索、分类标签筛选、20 篇分页、文章目录与代码复制。

## 开发与构建

环境：Node.js 18 或以上、npm。构建过程不请求外部数据。

```bash
cd /home/ubuntu/web2.0
npm ci
npm run build
npm run check
npm run preview
```

预览地址：http://127.0.0.1:8082 。这是服务器本机地址；远程查看可使用编辑器端口转发。
`dist/` 是唯一部署目录，不上传项目根目录。

## 内容维护

- `posts/`：85 篇完整迁移的 Markdown。保留原题号、中文文件名、正文、公式、图片和视频；标题与标签在 front matter 中维护。三张旧插图外链已失效，构建时替换为根据正文重绘的本地 SVG，并标注重绘；文章正文保持逐字节不变。
- `site.config.js`：个人资料、正式域名、项目与三篇首页精选。`unpublished` 中的 slug 不生成任何公开产物；非空 `password` 和 `draft: true` 同样不发布。
- `templates/`：共享文档模板与页面组件；`assets/`：CSS、浏览器脚本和原创 SVG。
- `scripts/build.js`：构建到 `dist/`，保留旧文章 URL；`scripts/check.js`：内容数量、站内链接、公式、公开索引与不发布文章的验证。

新增文章：在 `posts/` 添加 Markdown，可设置 `title`、`date`、`tags`、`categories`、`excerpt`、`slug`。运行构建和检查后发布。
标题规范：单题使用「题号 + 题名 + 题解」，比赛合集使用统一的赛事、年份与组别格式，笔记标题概括实际主题；不修改文件名、slug 与日期。
标签按正文人工维护为非空数组，算法名称统一使用 `动态规划`、`树形 DP`、`KMP`、`Z 函数`、`ST 表`、`扩展欧几里得算法` 等写法；单题通常保留 1–4 个核心标签，比赛合集可涵盖多个主要算法。
`review/article-metadata-changes.json` 记录本次 85 篇文章的标题、标签与分类前后对照。正文、标题和文末导航独立居中，正文最大宽度为 720px；目录在 1200px 及以上位于正文左侧并随滚动固定，较窄屏幕使用正文前的折叠目录。

默认 slug 规范化兼容旧站。`{% fold 标题 %}…{% endfold %}` 继续转为折叠块。
`question-resource.md` 仅保留源码，不发布；删除它的密码字段并从 `unpublished` 移除才会公开。
`hufuyezhong.md`（原神胡芙夜钟）保留源码，通过 `unpublished` 隐藏，不生成文章页，也不进入归档、全文搜索、标签、站点地图或相邻文章导航。独立小游戏、天气、行情和动态模块不再包含在网站中。

`dist/posts.json` 保持旧站字段：`title / date / slug / htmlFile / excerpt / tags / categories / readingMins`。
`dist/search-index.json` 仅含公开文章的 `{ slug, text }`，用于纯浏览器全文搜索。加载失败时使用标题、摘要与标签搜索；JavaScript 禁用时展示完整静态归档和正文。
界面语言不翻译文章标题、正文及作者定义的分类标签。偏好键：`qnxy-lang`、`qnxy-theme`。

## 部署到当前机器

```bash
cd /home/ubuntu/web2.0
npm run build
npm run check
sudo bash deploy/deploy.sh
```

部署脚本先检查，再将 `dist/` 复制到 `/var/www/qianianxy-releases/<版本>/`，通过 `/var/www/qianianxy-current` 链接切换。
原站 `/var/www/qianianxy.cn` 原样保留，证书、HTTPS 跳转和 ACME 路径保持原配置。
旧配置与当前站点副本保存在 `/var/backups/qianianxy/<版本>/`。切换后验证真实 TLS 虚拟主机、文章索引和 404；失败自动回滚。
JS/CSS 采用内容指纹，HTML/JSON 使用 `no-cache`；更新时保留上个版本资源，供已经打开的页面继续使用。
此后请使用新版部署脚本，旧仓库同步脚本只会更新已退出服务的旧目录。

回滚到一次部署之前的状态（使用部署输出的确切备份路径）：

```bash
sudo bash deploy/rollback.sh /var/backups/qianianxy/<版本>
```

## 浏览器验收与截图

`review/` 保存三种视口、浅深主题的页面截图及 `browser-results.json`。
浏览器验收使用独立安装的 Playwright，不属于生产依赖。用其支持的 Node 版本执行：

```bash
PLAYWRIGHT_MODULE_PATH=/tmp/qnxy-browser/node_modules/playwright \
  /tmp/qnxy-browser/node_modules/node/bin/node scripts/browser-check.cjs
```

默认对本地 8082 预览执行；可用 `SITE_URL` 指定验收地址。

## 当前上线记录

2026-10-23 美术细化已部署到 https://www.qianianxy.cn 。优化球体前后线条层次、精选卡片短标题、移动端辅助字号与按钮尺寸、深色主题对比度，以及归档控件和代码块细节。文章正文与公开范围保持不变。

- 本次版本：`/var/www/qianianxy-releases/20261023T070432Z-2310656`
- 回滚备份：`/var/backups/qianianxy/20261023T070432Z-2310656`
- 源码备份：`/home/ubuntu/web2-art-backup/before-visual-polish-20261023.tar.gz`
- 验证：`review/browser-results.json`、`review/visual-polish-checks.json`、`review/visual-polish-production.json`
- 截图：`review/visual-polish-desktop.png`、`review/visual-polish-mobile.png`

## 历史上线记录

2026-10-22 已更新到 https://www.qianianxy.cn 。

本次更新：代码复制按钮使用纯图标，复制成功显示勾，失败显示重试图标，无可见文字；左侧文章目录使用无衬线字体、更大的字号行距和细线章节指示；原神胡芙夜钟文章通过 `unpublished` 隐藏。现有 83 篇公开文章，85 篇 Markdown 源码全部保留。

- 当前版本：`/var/www/qianianxy-releases/20261022T131951Z-2065018`
- 本次备份：`/var/backups/qianianxy/20261022T131951Z-2065018`
- 本次修改前的源码备份：`/home/ubuntu/web2-art-backup/before-reading-refinements-20261022.tar.gz`
- 此前内容源文件备份：`/home/ubuntu/web2-content-backup-20261022`
- 标题标签对照：`review/article-metadata-changes.json`
- 本地完整浏览器验收：`review/browser-results.json`；本次专项本地验收：`review/reading-refinements-local.json`；正式站专项验收：`review/reading-refinements-results.json`。
- 前一版本：`/var/www/qianianxy-releases/20261022T125826Z-2058449`；此前截图及报告仍保存在 `review/`。

回滚此次部署：

```bash
sudo bash /home/ubuntu/web2.0/deploy/rollback.sh \
  /var/backups/qianianxy/20261022T131951Z-2065018
```
