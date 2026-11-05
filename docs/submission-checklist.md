# StationWarden 上架前检查清单

更新时间：2026-11-04
目标商店：Chrome Web Store、Edge Add-ons
不在本次范围：Firefox AMO（保留分节说明，当前不提交）

## 结论摘要

- 代码侧已完成：品牌名集中到单一来源（`src/constants/branding.ts`），manifest 名称固定为 `StationWarden`；补全 AGPL-3.0 上游署名与修改声明；修复 README 中 3 处非 ASCII 连字符坏链；修正文档站 `base` 路径，使 `privacy.html` / `uninstall.html` 的地址不再因项目页路径而 404；产品统计默认关闭并在设置页与安装引导中说明。
- 仍阻塞上架：GitHub Pages 尚未启用（当前隐私政策 URL 返回 404“There isn't a GitHub Pages site here”）；商店图标/截图未重绘；商店描述、数据使用表单、权限理由、单一用途、测试账号尚未在后台填写；名称商标初筛未完成。
- 构建验证：`pnpm compile` 通过；`pnpm build`（Chrome MV3）通过；`pnpm i18n:extract:ci` 通过。文档站本地构建受 Windows 符号链接权限限制未跑通（`os error 5`），CI（Ubuntu）应可正常构建，见文末“验证记录”。

状态口径：`已完成` = 仓库内已有可核验结果；`待办` = 仍需执行；`需人工` = 需要账号后台、素材或法务操作。

---

## Chrome Web Store

| 检查项 | 是否阻塞 | 当前状态 | 责任方 | 证据 / 备注 |
| --- | --- | --- | --- | --- |
| 名称原创且与 manifest 一致 | 是 | 已完成（名称）/ 待办（检索） | 代码 / 法务 | manifest 已固定为 `StationWarden`；三店站内检索与商标初筛未完成，见“名称与商标” |
| 图标为原创资产 | 是 | 待办 | 素材 | 当前仓库图标沿用上游资产，需核对来源并重绘或取得明确授权 |
| 商店截图重拍 | 是 | 待办 | 素材 | 现有截图来自上游 README，需用 StationWarden 品牌与中文界面重拍 |
| 描述文案含独立分支声明 | 是 | 文案已完成 / 后台待填 | 素材 / 账号 | README、扩展内“关于”页已含“独立开源分支，基于 All API Hub（AGPL-3.0）修改”、修改日期与源码链接 |
| 隐私政策 URL 可访问（HTTP 200） | 是 | 阻塞-待办 | 账号 / 代码 | 代码已修 `base`；但 GitHub Pages 尚未启用，实测 404。启用步骤见下节 |
| 数据使用表单与实际代码行为一致 | 是 | 待办 | 账号 / 代码 | 统计为 opt-in；不采集 API Key、Cookie、账号 URL、余额、请求正文。按此填写表单 |
| 权限理由填写 | 是 | 文案已起草 / 后台待填 | 代码 / 账号 | 见“权限必要性说明”，可直接用于后台理由字段 |
| 单一用途表述 | 是 | 文案待填 | 账号 | 建议：“管理 AI 中转站账号、余额、密钥，并对站点完整性与实际计费进行验真” |
| 测试账号与复现步骤 | 是 | 待办 | 账号 | 需提供可登录的测试站点账号，或说明审核员可用的演示模式 |
| 可复现构建与源码包 | 是 | 构建通过 / 打待办 | 代码 | `pnpm install --frozen-lockfile && pnpm build` 可复现；提交前需生成 zip 与对应源码归档（AGPL 要求） |
| 隐私政策内容覆盖统计与权限 | 是 | 已完成 | 代码 | 中/英/日 privacy 已改为“默认关闭、主动开启”，并列出采集字段 |
| 卸载反馈页可访问 | 否 | 随 Pages 修复 | 代码 / 账号 | 与隐私政策同站部署，地址 `.../my-api-box/uninstall.html` |
| 打包产物无上游品牌 / 调试标识 | 否 | 已完成 | 代码 | 产物 manifest 无上游名称；无 sourcemap；无 `My API Box`。仅保留内部持久化键与备份文件名中的 `all-api-hub` 前缀 |
| 商店后台隐私政策与开发者信息 | 是 | 待办 | 账号 | 需填写开发者联系方式、支持邮箱与隐私政策链接 |

---

## Edge Add-ons

Edge 复用同一 Chrome MV3 产物，以下为差异项；与 Chrome 相同的检查项不重复展开。

| 检查项 | 是否阻塞 | 当前状态 | 责任方 | 证据 / 备注 |
| --- | --- | --- | --- | --- |
| 上传同一 Chrome MV3 包 | 是 | 待办 | 代码 / 账号 | 使用 `pnpm build` 产物；Edge 无需单独构建 |
| Partner Center 权限理由字段 | 是 | 文案已起草 / 后台待填 | 账号 | 复用“权限必要性说明” |
| 单一用途与数据使用声明 | 是 | 待办 | 账号 | 与 Chrome 文案保持一致 |
| 隐私政策 URL 可访问 | 是 | 阻塞-待办 | 账号 | 同一个 GitHub Pages 地址；Pages 启用后同时满足两店 |
| 截图尺寸与 Edge 列表要求 | 是 | 待办 | 素材 | 使用重拍后的截图导出对应尺寸 |
| 扩展名称与图标一致 | 是 | 待办 | 素材 | 与 Chrome 保持一致，避免被判为不同产品 |

---

## Firefox AMO（暂不提交）

| 检查项 | 是否阻塞 | 当前状态 | 责任方 | 备注 |
| --- | --- | --- | --- | --- |
| Firefox 构建与 AMO 源码提交 | 不适用 | 未开始 | 代码 | 需 `pnpm build:firefox`，并按 AMO 要求提交源码包与构建说明 |
| 可选权限说明（cookies/webRequest） | 不适用 | 未开始 | 代码 | 现有 manifest 已按 Firefox 拆分可选权限 |
| AMO 隐私政策与数据声明 | 不适用 | 未开始 | 账号 | 待确定进入 AMO 时再补 |

---

## 隐私政策 URL：根因与修复步骤

### 根因

1. GitHub Pages 未启用。实测 `https://jinchaoqiang0311.github.io/my-api-box/privacy.html` 返回 404，页面提示 “There isn't a GitHub Pages site here.”。
2. 文档站 `base` 原为 `/`，但项目页实际挂在 `/my-api-box/` 下。构建出的资源与链接都指向域名根路径，即使 Pages 已启用，`/my-api-box/privacy.html` 也会因资源路径错误而不可用。

### 本次代码修复

- `docs/docs/.vuepress/config.js`：`base` 默认改为 `/my-api-box/`，图标等静态资源同步加前缀；支持 `DOCS_BASE_PATH` 环境变量覆盖。
- sitemap 的 `hostname` 改为站点根域名，避免与 `base` 重复拼接。
- `src/constants/branding.ts` 的 `APP_DOCS_URL` 与 `src/constants/about.ts` 保持同一地址来源。

### 需人工执行的步骤

1. 将本分支合并到 `main`。部署 workflow 只在 `main` 且 `docs/docs/**` 变更时触发。
2. 打开仓库 Settings → Pages → Build and deployment → Source 选择 “Deploy from a branch”，Branch 选择 `gh-pages`，目录选择 `/ (root)`，保存。远程已存在 `gh-pages` 分支，但 Pages 站点尚未启用。
3. 打开 Actions → “部署文档” → Run workflow，在 `main` 上手动执行一次，确认为绿色。
4. 验证以下地址均返回 200：
   - `https://jinchaoqiang0311.github.io/my-api-box/privacy.html`
   - `https://jinchaoqiang0311.github.io/my-api-box/en/privacy.html`
   - `https://jinchaoqiang0311.github.io/my-api-box/ja/privacy.html`
   - `https://jinchaoqiang0311.github.io/my-api-box/uninstall.html`
5. 确认 `gh-pages` 根目录存在 `.nojekyll`（workflow 已生成）。
6. 若后续绑定自定义域名：将 `DOCS_BASE_PATH` 设为 `/`，设置 `DOCS_HOSTNAME`，并同步更新 `APP_DOCS_URL` 与 `APP_PRIVACY_URL_*`。

---

## 权限必要性说明（可直接填入商店后台）

| 权限 | 声明方式 | 必要性 | 若改为可选的影响 |
| --- | --- | --- | --- |
| `host_permissions: <all_urls>` | 必需 | 用户可以添加任意 New API 兼容中转站；余额刷新、签到、模型同步、完整性探针与计费验真都需要向用户自填的任意 origin 发起请求，内容脚本也要在站点页面运行 | 改为 `optional_host_permissions` 需重写站点接入流程，逐 origin 弹窗授权；会破坏自动识别、后台刷新与探针连续性，因此保留 |
| `tabs` | 必需 | 打开/聚焦扩展页面，读取当前标签页用于站点识别与一键操作 | 部分入口跳转与站点识别失效 |
| `storage` / `unlimitedStorage` | 必需 | 本地保存账号、余额历史、设置与探针结果；`unlimitedStorage` 无安装警告 | 大量历史数据可能触及配额 |
| `alarms` | 必需 | 定时刷新、自动签到、公告检查与后台任务 | 定时能力失效 |
| `contextMenus` | 必需 | 划词兑换入口 | 右键兑换入口失效 |
| `scripting` | 必需 | 在页面内调用站点官方 Turnstile API，完成需要人机验证的站点操作 | 部分站点的验证流程不可用 |
| `sidePanel` | Chromium 必需 | Chromium 侧边栏主界面 | Chromium 侧边栏入口失效 |
| `declarativeNetRequestWithHostAccess` | Chromium 必需 | 站点兼容所需的请求头规则；MV3 要求安装时声明，首次可选授权会导致规则引擎未初始化 | Chromium 上部分站点请求失败 |
| `cookies` | 可选 | 仅在用户授权后读取登录态，用于需要 Cookie 的站点操作与签到 | 授权前相关功能保持不可用，符合最小化 |
| `notifications` | 可选 | 任务完成/失败通知 | 仅通知缺失 |
| `clipboardRead` | 可选 | 粘贴导入配置 | 手动粘贴导入受限 |
| `bookmarks` | 可选 | 从浏览器书签批量导入站点 | 书签导入不可用 |
| `webRequest` / `webRequestBlocking`（Firefox） | 可选 | Firefox 下 Cookie 会话拦截与请求适配 | 仅影响 Firefox，不在本次上架范围 |
| `nativeMessaging`（Safari） | 仅 Safari | Safari 原生桥接 | 不影响 Chrome/Edge |

说明：`cookies`、`webRequest` 等可选权限已在 manifest 中放入 `optional_permissions`，不在安装时索取；`<all_urls>` 保留为必需并在后台理由中说明“用户可添加任意中转站”。

---

## 品牌与合规待办

| 项目 | 状态 | 责任方 | 说明 |
| --- | --- | --- | --- |
| 名称三店检索（Chrome / Edge / Firefox） | 待办 | 法务 / 账号 | 检索 `StationWarden` 是否已有同名扩展 |
| 商标初筛 | 待办 | 法务 | 至少完成目标市场的基础检索；不要求注册 |
| 域名注册 | 待办 | 账号 / 法务 | 当前使用 GitHub Pages；建议注册独立域名作为隐私政策与官网入口 |
| 图标与截图原创 | 待办 | 素材 | 不得继续使用上游图标与截图 |
| 描述文案定稿 | 待办 | 素材 | 必须包含：独立开源分支、基于 All API Hub（AGPL-3.0）修改、源码仓库链接 |
| 源码归档 | 待办 | 代码 | 发布 zip 时附对应源码包或可复现提交哈希 |
| 隐私政策与代码一致性复核 | 已完成 | 代码 | 统计默认关闭；设置页与安装引导均说明采集范围 |
| 上游署名 | 已完成 | 代码 | README、`THIRD_PARTY_NOTICES.md`、扩展内“关于”页均含修改声明、日期、源码入口与 AGPL-3.0 |

---

## 验证记录

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `pnpm compile` | 通过 | `tsc --noEmit` 无错误 |
| `pnpm build` | 通过 | 生成 `.output/chrome-mv3`；manifest `name` 为 `StationWarden` |
| `pnpm i18n:extract:ci` | 通过 | 无待更新 key |
| `pnpm --dir docs run docs:build` | 未通过（环境） | Windows 创建 pnpm 符号链接报 `拒绝访问 (os error 5)`，与代码无关；需在 CI 或具备符号链接权限的环境复跑 |
| 产物扫描 | 通过 | 无 sourcemap；无 `My API Box`；无上游 manifest 名称 |

产物中仍可见 `all-api-hub` 的位置均为内部持久化标识（storage key、WebDAV 备份类型、Gist 文件名、通知 source 等），改名会破坏已有用户数据兼容，故保留且不在用户界面展示。

---

## 遗留风险

1. `<all_urls>` 仍是审核重点。功能上无法安全改为运行时按 origin 申请；需在后台理由中明确“用户可添加任意中转站”，并准备审核员复现步骤。
2. GitHub Pages 未启用是当前唯一确定的隐私政策阻塞项；代码修复不能替代后台开关与 workflow 执行。
3. 图标、截图、商店描述与测试账号未完成前不应提交审核。
4. 产品统计默认关闭的代码改动目前属于已有未提交工作（`src/services/productAnalytics/configuration/preferences.ts`），本次按要求保留原样、未纳入提交；上线前需随该功能一并提交。
5. 文档站构建未在本地复现通过，合并后应以 CI 结果为准；若 `base` 仍不生效，优先检查 `DOCS_BASE_PATH` 是否被 CI 环境覆盖。
