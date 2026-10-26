<h4 align="center">
简体中文 | <a href="./README.md">English</a> | <a href="./README_JA.md">日本語</a>
</h4>

<div align="center">

# My API Box – 你的中转站管家

> AGPL‑3.0 开源浏览器插件，集中管理 AI 中转站账号、API 密钥与模型价格——更有七探针完整性检测，验明中转站是否如实交付你付费的模型。

**余额查询、模型比价、自动签到、自建网关管理、以及七维站点验真，一处搞定。**

</div>

---

## 🎯 站点检测（Site Probing）

每个中转站都宣称自己卖的是半价 GPT‑4o——但它真的是吗？**My API Box 内置七种标准化探针**，对你添加的任何站点直接运行。每次检测消耗少量 token，报告可本地导出 JSON。

| 探针     | 检查什么                                                              | 能抓到什么                        |
| -------- | --------------------------------------------------------------------- | --------------------------------- |
| **可达性** | HTTP 往返 + 延迟                                                       | 站点挂了、超时                    |
| **身份指纹** | 站点自称模型 vs 你请求的模型家族交叉核对                                | 偷换模型                          |
| **注入检测** | 检测站点是否注入系统提示或降智改造                                      | 静默提示注入                      |
| **流式质量** | 首字延迟 + 分块数                                                       | 伪流式——假装真流式其实单块吐出    |
| **缓存命中** | 回显随机字符串两次，抓缓存回放                                         | 缓存回放式偷换                    |
| **一致性** | 与你自己的历史基线比对                                                 | 静默换模（同一请求，返回模型不同）|
| **计费验真** | 扣费前后余额差对账（需访问令牌 + 用户 ID）                              | 超扣、算错扣费                    |

每项探针给出 **通过 / 可疑 / 异常 / 跳过** 判定，每个站点一份汇总卡片。检测可从浮窗站点行 kebab 菜单直接发起，也可在独立"站点检测"页跑完整流程。

---

## 📦 其他能做什么

### 账号、密钥与比价

- **统一中转站看板**——全部余额、用量、状态，免逐站登录
- **API 凭据库**——别人分享或自己收集的 Base URL + Key，随时查、测、导出
- **跨站模型比价**——同模型跨站点按有效价格排序
- **账号级用量与趋势分析**——按站点、账号、模型出图

### 自建网关管理

管理 OmniRoute、CLIProxyAPI、New API、Sub2API、Magpie、gpt‑load、AxonHub、Claude Code Hub、Octopus、Veloera、DoneHub——**不用打开每个后台**。

- **从已有账号/凭据一键建网关通道**
- **模型同步 + 自定义重定向**——手动或定期同步上游模型列表；为客户端定义它期待的模型名
- **批量导入**——在 Magpie、New API、Octopus、gpt‑load 等网关，把同站点密钥合并导入

### 自动化与导出

- **一键 / 定时自动签到**（支持的站点）
- **多站点公告聚合**——维护、模型、调价等动态集中看
- **一键导出到常用客户端**——CC Switch、Cherry Studio、Claude Code Router、Kilo Code、Roo Code、Kelivo、AI Toolbox、Cursor++……
- **本地优先存储**，加密 WebDAV 自动同步与备份

---

## 🧩 兼容架构

**账号‑站点兼容**：New API · Sub2API · One API · one‑hub · Veloera · VoAPI / VoAPI v2 · DoneHub · Super‑API · APIyi · ModelFlare · v‑api · Neo‑API · RIX_API

**自托管网关 / 后台**：OmniRoute · CLIProxyAPI · Magpie · gpt‑load · AxonHub · Claude Code Hub · Octopus（在支持的站点上提供通道/提供商管理）

**客户端 / 开发工具导出**：CC Switch · Cherry Studio · Claude Code Router · Kilo Code · Roo Code · Kelivo · AI Toolbox · Cursor++……完整列表见文档

---

## 🖼️ 界面预览

<table>
  <tr>
    <td align="center">
      <img src="docs/docs/static/image/en/account-manage.png" alt="account-manage" style="width:100%; height:auto;"/>
      <div>账号管理</div>
    </td>
    <td align="center">
      <img src="docs/docs/static/image/en/model-list.png" alt="model-list" style="width:100%; height:auto;"/>
      <div>模型列表与比价</div>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="docs/docs/static/image/en/auto-check-in.png" alt="auto-check-in" style="width:100%; height:auto;"/>
      <div>自动签到</div>
    </td>
    <td align="center">
      <img src="docs/docs/static/image/en/account-model-usage-overview.png" alt="usage" style="width:100%; height:auto;"/>
      <div>用量总览</div>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="docs/docs/static/image/en/new-api-channel-sync.png" alt="model-sync" style="width:100%; height:auto;"/>
      <div>模型同步</div>
    </td>
    <td align="center">
      <img src="docs/docs/static/image/en/new-api-channel-manage.png" alt="channel-manage" style="width:100%; height:auto;"/>
      <div>通道管理</div>
    </td>
  </tr>
</table>

---

## 🚀 安装

> **商店版本即将上架**。目前请从 GitHub Release 下载手动安装。

| 渠道           | 下载地址                                                                             | 适用场景                                                                                            |
| -------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| GitHub 稳定版  | [下载](https://github.com/jinchaoqiang0311/my-api-box/releases/latest)              | Chrome、Edge、Firefox 及所有 Chromium 内核浏览器手动加载                                    |
| Nightly 预发布 | [下载](https://github.com/jinchaoqiang0311/my-api-box/releases/tag/nightly)          | 抢先体验——稳定性可能略差                                                                   |

两种渠道都不会自动更新，**Star / Watch 仓库** 接收新版本通知。

<details>
<summary>📦 手动加载插件（点击展开）</summary>

1. 下载并解压最新构建。
2. 打开 `chrome://extensions`（Edge: `edge://extensions`；Firefox: `about:debugging#/runtime/this-firefox`）。
3. 打开 **开发者模式**。
4. 点击 **加载已解压的扩展程序**，选择解压出来的文件夹。
5. 把 My API Box 固定到工具栏。

QQ 浏览器、360 浏览器、Safari、移动端浏览器的安装步骤见 [文档](https://all‑api‑hub.qixing1217.top/en/get‑started.html)。
</details>

**30 秒上手**

1. 安装插件。
2. 在浏览器里登录你常用的 AI 中转站。
3. 点击插件图标 → **新增账号** → 输入站点网址 → **自动识别**。
4. 完事——余额、模型、签到全就绪。

---

## 🏗️ 技术栈

- **构建管线** — [WXT](https://wxt.dev)（多浏览器扩展）
- **UI** — [React](https://react.dev) + [Radix UI](https://www.radix-ui.com/) 组件 + [Tailwind CSS](https://tailwindcss.com)
- **语言** — 全链路 [TypeScript](https://www.typescriptlang.org)

---

## 📜 许可证

My API Box 采用 AGPL‑3.0 许可证，派生自 [all‑api‑hub](https://github.com/qixing‑jk/all‑api‑hub)（同为 AGPL‑3.0）。详见 [LICENSE](./LICENSE) 与 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。

若需要 AGPL‑3.0 之外的商业授权（闭源 / 白标使用上游代码），请联系 all‑api‑hub 上游作者。第三方依赖及历史 MIT 许可片段保留各自的版权与许可声明。

---

## 🔗 生态与致谢

**基于**

- [all‑api‑hub](https://github.com/qixing‑jk/all‑api‑hub) — My API Box 的上游 fork 源
- [WXT](https://wxt.dev) — 现代浏览器扩展开发框架

**社区项目（受 My API Box 启发或与其集成）**

| 项目                                                        | 描述                                     |
| ----------------------------------------------------------- | ---------------------------------------- |
| [Metapi](https://github.com/cita‑777/metapi)                | 自托管元聚合网关                            |
| [Fl API Hub](https://github.com/RebornQ/fl_api_hub)         | 跨平台原生管理客户端                          |
| [APIManager](https://github.com/zhalice2011/api‑manager)    | 本地 AI API 聚合代理                          |

> 如果你有相关项目想加进列表，欢迎 PR。

<div align="center">
  <strong>⭐ 觉得好用的话，给仓库点个 Star 吧！</strong>
</div>
