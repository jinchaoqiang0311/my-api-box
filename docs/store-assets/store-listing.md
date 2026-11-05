# StationWarden 商店文案（Chrome Web Store / Microsoft Edge Add-ons）

> 版本对齐：v1.1.0 · 品牌：StationWarden · 单一用途：管理 AI API 中转站账号并验证其服务质量与计费
> 配套素材：`docs/store-assets/screenshots/01–06`、`docs/store-assets/icon/`
> 源码：<https://github.com/jinchaoqiang0311/my-api-box>

## 0. 平台字段与字符上限（已核对）

| 平台 | 字段 | 上限 | 依据 / 备注 |
|---|---|---|---|
| Chrome Web Store | 简短描述（Summary） | **132 字符** | Chrome 官方文档明确：summary「132 characters or less」，manifest `description` 同样 ≤132 |
| Chrome Web Store | 详细描述（Description） | **16,000 字符** | 开发者中心字段上限（官方文档未写明数字，以提交页计数器为准）；本文中文稿约 1,370 字符，英文稿约 3,550 字符，均远低于上限 |
| Chrome Web Store | 截图 | 1–5 张，1280×800 或 640×400 | 官方要求至少 1 张、最多 5 张 |
| Microsoft Edge Add-ons | 简短描述 | **132 字符** | Edge 的 Short description 由包内 manifest `description` 填充，遵循 Chromium manifest 规范（≤132） |
| Microsoft Edge Add-ons | 详细描述 | **10,000 字符** | Partner Center 字段上限（官方文档未写明数字）；提交页有实时计数器，提交前以页面显示为准 |
| Microsoft Edge Add-ons | Search terms（可选） | ≤7 个词/短语，每个 ≤30 字符，合计 ≤21 词 | 不展示给用户，仅用于搜索 |

说明：Chrome 与 Edge 的简短描述都走 manifest，两个平台的简短描述已控制在 132 字符内；若 Edge 提交页允许更长，可选用下方「Edge 备选简短描述（≤200）」而无需改动包体。

---

## 1. Chrome Web Store

### 1.1 单一用途（Single purpose）

- 中文：**管理 AI API 中转站账号并验证其服务质量与计费。**
- English: **Manage AI API relay-station accounts and verify their service quality and billing.**

### 1.2 简短描述（≤132 字符）

中文（46 字符）：

> 管理 AI API 中转站账号，核对余额与用量，并用七项探针与计费验真检查站点是否名副其实。

English（127 字符）：

> Manage AI relay-station accounts, then verify service quality and billing with seven integrity probes and price reconciliation.

### 1.3 详细描述（中文）

StationWarden 是一个 AI API 中转站（relay）账号管理器，也是一个验真工具。在 All API Hub 已有的账号聚合、余额与用量、密钥与书签、自动签到等能力之上，它增加了两套**不同维度**的验证：**七项完整性探针**回答「站点有没有按承诺提供服务」，**计费验真**回答「站点收的钱是否对得上它公布的价格」。前者查服务质量，后者查计费一致性，二者互相独立，不能互相替代。

**七项完整性探针**
一次运行按顺序执行，每项给出「通过 / 可疑 / 异常 / 未知 / 跳过」的机器判定与证据：

- 可达性：站点是否在线、响应延迟；
- 身份指纹：让模型自报身份，与请求的模型家族交叉核对，识别偷换模型；
- 注入检测：检查站点是否在请求中塞入未声明的系统提示或降智指令；
- 缓存回放：用两个随机码回显，识别缓存命中与答案回放；
- 流式质量：测量首字延迟与分块数量，识别「伪流式」；
- 计费验真：见下一节；
- 一致性：与本地历史基线比对，识别静默换模。

探针只消耗少量 token，运行前会给出 token 与成本上限；报告保存在本地，可一键复制为 JSON。

**计费验真**
不是只看余额，而是把三件事对齐：

1. 用站点 `/api/pricing` 公布的单价（含 completion / cache 倍率、分组倍率、按次计费或自定义计费表达式）算出本次请求的**应扣金额**；
2. 通过 `/api/user/self` 读取请求前后的余额差，得到**实际扣费**；
3. 读取站点消费日志中记录的本次分组倍率作为基准，给出**差额、偏差比例与判定**（正常 / 低于标价 / 高于标价）。

站点使用自动分组或未公开的折扣组时，会用实测扣费反推实际倍率，而不是用假设值代替。

**账号与密钥管理**
添加任意 New API 兼容中转站，集中查看余额、今日用量、模型价格与站点公告，管理 API 密钥、常用链接与自动签到。所有账号数据默认只保存在本机浏览器中。

**隐私与数据**
- 不收集浏览历史，不读取与所添加站点无关的页面内容；
- 匿名使用统计**默认关闭**，可在设置中随时开启或关闭；
- 可选的「匿名贡献验真数据」同样**默认关闭**；开启后仅上传判定结果、延迟等指标与公开价格，可选择先对站点域名做哈希，绝不上传 API 密钥、访问令牌、余额绝对值或个人数据。

**来源声明**
StationWarden 是独立开源分支，基于 [All API Hub](https://github.com/qixing-jk/all-api-hub) 修改，遵循 AGPL-3.0。源码仓库：<https://github.com/jinchaoqiang0311/my-api-box>。本项目**非官方**版本，与上游作者无隶属关系，**未获上游背书**；上游名称与版权归其作者所有。

**权限说明**
扩展需要 `<all_urls>` 主机权限，因为你添加的中转站域名无法预先枚举。只有获得该权限，扩展才能调用你添加站点的 API、读取余额与用量，并在你授权后读取站点登录态 Cookie 以完成自动签到等操作。扩展不会主动向未添加的站点发送请求。

### 1.4 Detailed description (English)

StationWarden is an account manager for AI API relay stations — and a verification tool. On top of the account aggregation, balance and usage tracking, key and bookmark management, and auto check-in that All API Hub already provides, it adds two **independent** verification layers: **seven integrity probes** answer "does this station deliver the service it promises?", while **billing verification** answers "does the charge match the price the station publishes?". One checks service quality; the other checks billing consistency. Neither replaces the other.

**Seven integrity probes**
A single run executes them in order and returns a machine verdict (pass / suspect / fail / unknown / skipped) plus evidence for each:

- Reachability: is the station online, and how fast does it answer;
- Identity: ask the model to report itself, then cross-check its family against the requested model to catch substitution;
- Injection: detect undeclared system prompts or downgrading instructions;
- Cache replay: two random-code echoes to catch cached answers;
- Streaming: time-to-first-token and chunk count to catch fake streaming;
- Billing: see the next section;
- Consistency: compare against a stored local baseline to catch silent model swaps.

A run costs a few tokens, the UI shows a cost ceiling before you start, and the report stays local and exports as JSON.

**Billing verification**
Instead of only watching the balance, it aligns three facts:

1. Compute the **expected charge** from the station's published `/api/pricing` row (completion and cache multipliers, group ratio, per-call pricing, or a custom billing expression);
2. Read quota before and after one request via `/api/user/self` to obtain the **actual deduction**;
3. Read the group multiplier the station recorded in its own consumption log, then report the **difference, deviation ratio and verdict** (normal / below list price / above list price).

When a station routes through auto groups or unpublished discount groups, the measured deduction is used to back-solve the applied multiplier instead of assuming one.

**Account and key management**
Add any New API-compatible station, review balances, daily usage, model prices and announcements, and manage API keys, bookmarks and check-in. Account data stays in your browser by default.

**Privacy and data**
- No browsing history is collected, and pages unrelated to the stations you add are never read;
- Anonymous usage analytics are **off by default** and can be toggled in settings at any time;
- The optional "anonymous verification contribution" is also **off by default**; when enabled it uploads only verdicts, latency-style metrics and public prices, can hash the station domain first, and never uploads API keys, access tokens, absolute balances or personal data.

**Provenance**
StationWarden is an independent open-source fork based on [All API Hub](https://github.com/qixing-jk/all-api-hub), licensed AGPL-3.0. Source: <https://github.com/jinchaoqiang0311/my-api-box>. This project is **not official**, is not affiliated with the upstream author, and has **no upstream endorsement**; upstream names and copyrights belong to their authors.

**Permissions**
The extension requests `<all_urls>` host permissions because the relay stations you add cannot be known in advance. That access is what lets it call your stations' APIs, read balances and usage, and — only after you grant the optional cookie permission — read a station's session cookie for check-in. It never sends requests to stations you have not added.

---

## 2. Microsoft Edge Add-ons

### 2.1 Single purpose description

> Manage AI API relay-station accounts and verify their service quality and billing.

中文对照：管理 AI API 中转站账号并验证其服务质量与计费。

### 2.2 Short description（来自 manifest，≤132 字符）

> Manage AI relay-station accounts, then verify service quality and billing with seven integrity probes and price reconciliation.

中文对照（46 字符）：

> 管理 AI API 中转站账号，核对余额与用量，并用七项探针与计费验真检查站点是否名副其实。

**Edge 备选简短描述（≤200 字符，仅在提交页允许更长时使用）**

> Manage AI relay-station accounts, balances and keys, then verify model identity and billing with seven integrity probes and price reconciliation.

### 2.3 Description

Edge 的详细描述可直接复用 Chrome 的详细描述（中文或英文），无需改写；两者面向的审核标准一致。若需按 Edge 页面习惯做微调，建议保留「七项探针 / 计费验真 / 来源声明 / 权限说明」四段结构与顺序，不要删减来源声明。

### 2.4 Search terms（可选，≤7 个且每个 ≤30 字符）

`AI relay` · `API account manager` · `billing check` · `model verification` · `New API` · `token usage`

### 2.5 Permission justification（提交页逐项填写时用）

- **`<all_urls>` host permission**：The app manages relay stations the user adds at runtime; their domains cannot be enumerated in advance. Host access is required to call each station's API for balances, usage, model prices and probes. No requests are sent to stations the user has not added.
- **`storage` / `unlimitedStorage`**：Persist account records, probe reports and preferences locally.
- **`cookies`（可选权限，按需申请）**：Read the signed-in session of a station the user explicitly added, solely for check-in and account auto-detection.
- **`scripting` / `tabs`**：Open the station's own page and run the user-initiated check-in action in the extension's own context.
- **Remote code**：No. The extension ships all logic in the package.

---

## 3. 截图与描述对应关系

Chrome 最多 5 张、Edge 上限以提交页计数器为准。建议顺序 **01 → 03 → 05 → 06 → 04**；`02-account-management.png` 作为第 6 张备选，若平台只允许 5 张则优先舍弃（账号管理不是本分支的差异化点）。

| # | 文件（1280×800） | 放在描述哪一段 | 建议配文（英文区可直接用） |
|---|---|---|---|
| 01 | `01-overview.png` | 开头「一屏总览」段 | "All relay accounts, balances and today's usage in one place." |
| 03 | `03-site-probing.png` | 「七项完整性探针」段开头 | "Pick a station and model, then run the seven probes; a cost ceiling is shown before you start." |
| 05 | `05-probe-results.png` | 「七项完整性探针」段结尾 | "Each probe returns a verdict and evidence — here: 5 pass, 1 suspect, 1 fail." |
| 06 | `06-billing-reconciliation.png` | 「计费验真」段 | "Expected charge from the published price vs the actual deduction, with the difference and verdict." |
| 04 | `04-settings.png` | 「隐私与数据」段 | "Analytics and anonymous contributions are off by default; turn them on only if you want to." |
| 02 | `02-account-management.png`（备选） | 「账号与密钥管理」段 | "Add any New API-compatible station and keep balances fresh." |

补充约束：六张图均为虚构站点（Nebula Relay / Orbit Relay / Lumen Gateway / Vector Relay）与假 token，不含真实账号、真实 API Key、上游品牌或上游域名。

---

## 4. 提交前校对清单

- [ ] 简短描述 ≤132 字符（中英各一版，已在 §1.2 标注字数）
- [ ] 详细描述未出现「官方 / 原版 / 授权版 / 正版」等措辞
- [ ] 已附源码仓库链接与 AGPL-3.0 来源声明，明确「非官方、未获上游背书」
- [ ] 单一用途表述与各平台字段完全一致
- [ ] 权限说明覆盖 `<all_urls>`、可选 cookies、远程代码（否）
- [ ] 隐私政策 URL：<https://jinchaoqiang0311.github.io/my-api-box/privacy.html>
- [ ] 统计默认关闭的代码状态与文案一致（若包体仍默认开启，先改代码再提交，否则本条不成立）
