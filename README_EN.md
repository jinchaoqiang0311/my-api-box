<h4 align="center">
<a href="./README_CN.md">简体中文</a> | English | <a href="./README_JA.md">日本語</a>
</h4>

<div align="center">

# My API Box – Your Relay Station Manager

> AGPL-3.0 · Browser extension that aggregates AI relay accounts, API keys, and model pricing — and probes whether stations deliver what they promise.

**One-click access to balances, model prices, auto check-ins, self-hosted gateway management, and seven-integrity-probe site verification.**

</div>

---

## 🎯 The Site Probing Suite

Every relay says it gives you GPT-4o for half price — but does it really? **My API Box ships with seven standardised probes** that run against any station you add. A run takes a few tokens; the report exports as JSON for your records.

| Probe          | What it checks                                                                    | Catches                                    |
| -------------- | --------------------------------------------------------------------------------- | ------------------------------------------ |
| **Reach**      | HTTP round‑trip and latency                                                       | Dead stations, timeouts                    |
| **Identity**   | Cross-check what the station *claims* to be serving vs. what you *asked* for      | Model swapping                            |
| **Injection**  | Looks for hidden system prompts or capability‑dumbing modifications               | Silent prompt injection                    |
| **Stream**     | First‑token latency and chunk count                                               | Fake streaming that pretends to be real    |
| **Cache**      | Echo a random string twice — did the server replay the first answer from cache?   | Cache‑replay bait‑and‑switch              |
| **Consistency**| Compare against your own historical baseline                                      | Silent model drift between runs            |
| **Billing**    | Deducts before‑balance vs. after‑balance; requires user token & ID                | Over‑billing, incorrect cost calculation   |

Results surface as **Pass / Suspect / Fail / Skip** verdicts per probe, plus a per‑station summary card. Probes run from both the popup account kebab menu and the dedicated Site Probing page.

---

## 📦 What Else It Does

### Accounts, Keys & Pricing

- **Unified relay dashboard** — all balances, usage, and status without signing into each site
- **API Credential Library** — Base URLs + Keys you collected or were shared; check, test, export anytime
- **Cross‑site model price comparison** — same model across stations, sorted by effective cost
- **Account‑level usage & trend analytics** — charts by site, account, and model

### Self‑Hosted Gateway Management

Manage OmniRoute, CLIProxyAPI, New API, Sub2API, Magpie, gpt‑load, AxonHub, Claude Code Hub, Octopus, Veloera, DoneHub — **without opening each admin panel**.

- **Create gateway channels** from saved accounts or credentials
- **Model sync & redirects** — manual or scheduled upstream‑model sync; custom redirects for model names your clients expect
- **Batch import** — merge same‑site keys on Magpie, New API, Octopus, gpt‑load, and more

### Automation & Export

- **One‑click / scheduled auto check‑in** across supported stations
- **Announcements from all sites** collected and surfaced in one place
- **One‑click client export** to CC Switch, Cherry Studio, Claude Code Router, Kilo Code, Roo Code, Kelivo, AI Toolbox, Cursor++…
- **Local‑first storage** with encrypted WebDAV sync & backup

---

## 🧩 Supported Architecture

**Account‑site compatible**: New API · Sub2API · One API · one‑hub · Veloera · VoAPI / VoAPI v2 · DoneHub · Super‑API · APIyi · ModelFlare · v‑api · Neo‑API · RIX_API

**Self‑hosted admin backends & gateways**: OmniRoute · CLIProxyAPI · Magpie · gpt‑load · AxonHub · Claude Code Hub · Octopus (+ channel/provider management, where supported)

**Client & dev‑tool exports**: CC Switch · Cherry Studio · Claude Code Router · Kilo Code · Roo Code · Kelivo · AI Toolbox · Cursor++ … see docs for the full list

---

## 🖼️ UI Preview

<table>
  <tr>
    <td align="center">
      <img src="docs/docs/static/image/en/account-manage.png" alt="account-manage" style="width:100%; height:auto;"/>
      <div>Account Management</div>
    </td>
    <td align="center">
      <img src="docs/docs/static/image/en/model-list.png" alt="model-list" style="width:100%; height:auto;"/>
      <div>Model List &amp; Pricing</div>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="docs/docs/static/image/en/auto-check-in.png" alt="auto-check-in" style="width:100%; height:auto;"/>
      <div>Auto Check‑in</div>
    </td>
    <td align="center">
      <img src="docs/docs/static/image/en/account-model-usage-overview.png" alt="usage" style="width:100%; height:auto;"/>
      <div>Usage Overview</div>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="docs/docs/static/image/en/new-api-channel-sync.png" alt="model-sync" style="width:100%; height:auto;"/>
      <div>Model Sync</div>
    </td>
    <td align="center">
      <img src="docs/docs/static/image/en/new-api-channel-manage.png" alt="channel-manage" style="width:100%; height:auto;"/>
      <div>Channel Management</div>
    </td>
  </tr>
</table>

---

## 🚀 Installation

> **Store build coming soon.** For now, install from GitHub releases.

| Channel             | Download                                                                             | Best For                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| GitHub Stable       | [Download](https://github.com/jinchaoqiang0311/my-api-box/releases/latest)          | Manual install on Chrome, Edge, Firefox, or any Chromium browser                                    |
| Nightly pre‑release | [Download](https://github.com/jinchaoqiang0311/my-api-box/releases/tag/nightly)      | Early access — may be less stable                                                                   |

Both channels require manual loading; **Star / Watch the repo** for release notifications.

<details>
<summary>📦 How to load an unpacked extension (click to expand)</summary>

1. Download and unzip the latest build.
2. Open `chrome://extensions` (or `edge://extensions`, `about:debugging#/runtime/this-firefox`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder.
5. Pin My API Box to your toolbar.

For QQ Browser, 360 Browser, Safari, or mobile browsers, see [the docs](https://all‑api‑hub.qixing1217.top/en/get‑started.html) for platform‑specific steps.
</details>

**30‑second quick start**

1. Install the extension.
2. Log in to your usual AI relay in the browser.
3. Click the extension icon → **Add Account** → enter the site URL → **Auto Detect**.
4. Done — balances, models, check‑ins are all ready.

---

## 🏗️ Tech Stack

- **Build pipeline** — [WXT](https://wxt.dev) (multi‑browser extensions)
- **UI** — [React](https://react.dev) + [Radix UI](https://www.radix-ui.com/) primitives + [Tailwind CSS](https://tailwindcss.com)
- **Language** — [TypeScript](https://www.typescriptlang.org) end‑to‑end

---

## 📜 License

My API Box is AGPL‑3.0, derived from [all‑api‑hub](https://github.com/qixing‑jk/all‑api‑hub) (also AGPL‑3.0). See [LICENSE](./LICENSE) and [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

For commercial licensing beyond AGPL‑3.0, contact the upstream all‑api‑hub author. Third‑party dependencies and historical MIT‑licensed portions retain their own notices.

---

## 🔗 Ecosystem & Acknowledgements

**Built on**

- [all‑api‑hub](https://github.com/qixing‑jk/all‑api‑hub) — the upstream project My API Box is forked from
- [WXT](https://wxt.dev) — modern browser extension framework

**Community projects inspired by or integrating with My API Box**

| Project                                                     | Description                             |
| ----------------------------------------------------------- | --------------------------------------- |
| [Metapi](https://github.com/cita‑777/metapi)                | Self‑hosted meta‑aggregation gateway    |
| [Fl API Hub](https://github.com/RebornQ/fl_api_hub)         | Cross‑platform native management client |
| [APIManager](https://github.com/zhalice2011/api‑manager)    | Local AI API aggregation proxy          |

> PRs welcome if you have a project to add.

<div align="center">
  <strong>⭐ If this helps you, consider giving the repo a star!</strong>
</div>
