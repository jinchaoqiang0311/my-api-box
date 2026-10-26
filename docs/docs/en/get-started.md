# Getting Started

In just a few minutes, you can start your journey of intelligent AI asset management. My API Box can help you automatically sync quotas, perform daily check-ins, and integrate with your favorite AI tools with one click.

::: tip Current status (v1.0.0)
Store listings are pending browser review. **For now, install from GitHub Releases**. Store versions will auto‑update once published. **Star / Watch the repo** to be notified when stores go live.
:::

| Channel | Download | Best For |
|---------|----------|----------|
| **GitHub Releases (recommended)** | [my-api-box-v1.0.0.zip](https://github.com/jinchaoqiang0311/my-api-box/releases) | Manual load in Chrome / Edge / Firefox and all Chromium browsers; Nightly prerelease also available |
| Chrome Web Store | Coming soon | Auto‑update once listed |
| Edge Add-ons | Coming soon | Auto‑update once listed |
| Firefox Add-ons | Coming soon | Auto‑update once listed |


## 2. Add Your First Account

This is the most crucial step for using the plugin. We **highly recommend using the "Auto-Recognize" feature**, which is as simple as scanning a QR code to log in.

### 2.1 Auto-Recognize (Recommended)

::: tip First Step
Open and log in to your AI proxy station website in your browser first.
:::

1. Click the plugin icon in the top-right corner of your browser to open the main page.
2. Click **`Add Account`**.
3. Enter the URL of the site in the dialog that appears.
4. Click **`Auto-Recognize`**.
5. After confirming the information is correct, click **`Confirm Addition`**.

::: tip Don't have an account yet
If you are looking for stable, efficient, and highly compatible AI relay services, try our partners:

- [Qiniu Cloud AI](https://s.qiniu.com/qE3eai): An enterprise MaaS platform with one-stop access to 150+ mainstream global models. Enterprise users can claim 12 million free tokens.
- [FennoAI](https://api.fenno.ai/s/DCGC): A stable and efficient Codex relay provider compatible with OpenAI and Anthropic protocols. It supports popular coding tools and enterprise workloads of up to 100 billion tokens per day. My API Box users can get $50 in Coding Plan credits for $1.99, and referral purchases earn up to 20% commission. [Setup guide](./service-guides/fenno.md)
- [PackyCode](https://www.packyapi.ai/register): Enter the `all-api-hub` promo code during recharge to get 10% off. [Setup guide](./sponsor-guides/packycode.md)
- [Xingchen AI](https://ai.centos.hk): 1:1 top-up ratio, invoicing support, and Claude pricing as low as 40% of the standard price. [Setup guide](./sponsor-guides/xingchen.md)
- [AICodeMirror](https://www.aicodemirror.ai/register): Official high-stability relay services for Claude Code / Codex / Gemini CLI. Register through this link to get 20% off your first top-up, and enterprise customers can get up to 25% off.
- [Suixiang AI Relay](https://sui-xiang.com/): API relay services for Claude, Codex, Gemini, and more, with pay-as-you-go billing, daily check-in test credits, redundant routes, and automatic failover. [Setup guide](./service-guides/suixiang.md)
- [APIMart](https://go.apimart.ai/gh-all-api-hub): A low-cost API platform for AI image & video generation — GPT-Image-2 from $0.006/image, 160+ images per dollar. One async API covers both image and video: submit a task, get an ID, fetch results via polling or callback. Batch tens of thousands of images without timeouts, switch models without changing code. Pay-as-you-go with no monthly fee.
- [88API Token Aggregation Platform](https://88api.ai/register): A one-stop multi-model API platform operated by a Hong Kong company, with a unified API for text, image, speech, and video models. Supports adding and switching providers in CC Switch, major international payment methods, and invoicing. Register through the dedicated link for bonus credits.
- [Dola Seed on BytePlus ModelArk](https://www.byteplus.com/en/product/modelark): Register through BytePlus ModelArk to get 500,000 free inference tokens per model.
:::

> **Shield Bypass Tip**: If the site has Cloudflare verification (5-second shield), the plugin will automatically pop up a window to assist with bypassing it. Once verified, it will continue the recognition process automatically.

<a id="manual-addition"></a>
### 2.2 Manual Addition (Alternative)

If auto-detection fails, click **"Manual Add"**, select the site type, and enter the account information yourself. See the [manual account addition guide](./add-account.md#manual-addition) for the required fields, where to find the Access Token, and important precautions.

---

## 3. Supported Site Types

No matter which architecture you use, there is a good chance we support it:
- **Account-site compatible architectures**: New API, One API, Sub2API, One-Hub, Veloera, Done-Hub, and more.
- **Specialized account platforms and compatible implementations**: [OpenRouter](https://openrouter.ai/), [AnyRouter](https://anyrouter.top/register), [AgentRouter](https://agentrouter.org/register), [AIHubMix](https://aihubmix.com/), Super-API, v-api, Neo-API, and more.
- **Self-hosted admin backends**: New API, Sub2API, AxonHub, Claude Code Hub, [Octopus](https://github.com/bestruirui/octopus), Veloera, Done-Hub, and more, for backend management, migration, and partial model sync.

::: tip Compatibility Tip
Relay sites built on account-site compatible architectures can usually be added as accounts. AxonHub, Octopus, Claude Code Hub, and similar systems are mainly used as self-hosted admin backends. For a complete compatibility list, please check [Supported Sites and System Types](./supported-sites.md).
:::

<a id="quick-export-sites"></a>
## 4. Quick Export and Integration

After adding an account, you can "push" these configurations to other AI tools with one click, eliminating the need for manual copy-pasting.

1. Go to the **`Key Management`** page.
2. Find the key you want to export. To import it into your configured self-hosted site, select that site's icon directly in the actions area. For other tools, select **`Export`** and choose a target from **Chat clients**, **Coding agents**, or **Gateways and routing tools**.
3. Follow the dialog instructions to launch the application, copy or download the configuration, or import it through the target management API.

> For a complete list, please see [Supported Export Tools and Integration Targets](./supported-export-tools.md).

---

## 5. In-depth Guide to Core Features

### 📊 Asset Dashboard & Statistics
- **[Settings Page Overview (Main Dashboard)](./options-overview.md)**: View account status, API Credential Library, today's usage, and to-do items all in one screen.
- **[Overview & Real-time Refresh](./auto-refresh.md)**: Centrally view balances, usage, and health status across multiple sites.
- **[Balance History](./balance-history.md)**: Visualize asset change trends with historical data.
- **[Usage Analytics](./usage-analytics.md)**: Multi-dimensional analysis of consumption, model distribution, and latency.

### 🔑 Key Management & Quick Integration
- **[Token Management](./key-management.md)**: Centrally manage site tokens, with support for one-click completion.
- **[API Credential Library](./api-credential-profiles.md)**: Save `Base URL + API Key` without needing an account, then copy, verify, and view models from it.
- **[Web API Sniffing](./web-ai-api-check.md)**: Quickly identify and test API configurations within a webpage.

### ⚡ Automation & Information Tracking
- **[Auto Check-in Flow](./auto-checkin.md)**: Schedule daily check-ins for detected, supported accounts, run them immediately, and review the latest results.
- **[Site Announcements](./site-announcements.md)**: Fetch announcements from saved sites in the background and centrally review maintenance, model changes, pricing updates, and other messages.
- **[Redemption Assistant](./redemption-assist.md)**: Automatically recognize redemption codes on webpages and claim them with one click.
- **[Bookmark Management](./bookmark-management.md)**: Centrally collect console links, documentation, recharge portals, and more.

### 🛡️ Stability & Security Protection
- **[Cloudflare Bypass Assistant](./cloudflare-helper.md)**: Helps a flow continue when webpage verification is required.
- **[WebDAV Sync & Encryption](./webdav-sync.md)**: Supports cross-device encrypted backups, ensuring data is never lost.

### 🔔 Notification Channels
- **[Task notifications](./task-notifications.md)**: Enable them in **`Settings → General → Notifications`** to receive background task result reminders through browser system notifications, Telegram Bot, Feishu Bot, DingTalk Bot, WeCom Bot, ntfy, or generic webhook delivery.

### 🛠️ Self-hosted Site Operation Tools
- **[Self-hosted Site Management](./self-hosted-site-management.md)**: Directly add, delete, modify, and query channels within the plugin.
- **[Model Sync & Redirection](./managed-site-model-sync.md)**: Batch sync upstream models and configure mapping logic.

---

## 6. Other Information

- [Frequently Asked Questions FAQ](./faq.md)
- [Changelog](./changelog.md)
- [Permissions Explanation](./permissions.md)
- [Data Import and Export](./data-management.md)
