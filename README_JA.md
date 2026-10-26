<h4 align="center">
<a href="./README_CN.md">简体中文</a> | <a href="./README.md">English</a> | 日本語
</h4>

<div align="center">

# My API Box - あなたの中継ステーション管理

> [all-api-hub](https://github.com/qixing-jk/all-api-hub)(AGPL-3.0)をベースに改変した **My API Box** です。ソースコードは同一ライセンスで公開しています(LICENSE / THIRD_PARTY_NOTICES.md 参照)。

**New API 互換の中継サイトアカウントを一元管理：残高、使用量、モデル価格、自動チェックイン、API 認証情報、ページ内テスト、チャネル/モデル同期とリダイレクトに対応**




</div>

<a id="introduction"></a>

## ❓ My API Box が必要な理由

**簡単に言うと**、AI 中継サイトは AI クレジットのマーケットのようなもので、ChatGPT、Claude、GPT Image などのモデルを低コスト、場合によっては無料で使えるようにします。

ただし、複数のアカウントを持つと管理はすぐに面倒になります。

- 📂 **資産が分散する**：残高と使用量をサイトごとに確認する必要があります。
- 💲 **価格が分かりにくい**：課金倍率がサイトごとに異なり、どこが得か判断しづらくなります。
- ✅ **毎日の特典を逃しやすい**：手動チェックインは忘れがちです。
- 🔌 **設定が手間**：API 情報を cc-switch や Cherry Studio などのツールへ何度もコピーする必要があります。

**My API Box は、あなたの AI 資産マネージャーです**。サイト URL を追加すれば、残りの管理は拡張機能が引き受けます。

<a id="features"></a>

## ✨ My API Box でできること

### 📊 AI 資産をまとめて把握

- **中継サイトアカウントの統合管理**：複数のアカウントを一か所で管理し、サイトごとにログインし直すことなく残高、利用量、状態を確認できます。
- **API 認証情報ライブラリ**：サイトアカウントを登録せず、共有されたものや日頃個別に収集した Base URL と API Key をまとめて保存できます。残高確認、モデル閲覧、接続テスト、クライアントへのエクスポートもすぐに使えます。
- **利用量と傾向の統計**：残高の変化を記録し、サイト、アカウント、モデルごとのグラフからクレジットの使い道を把握できます。

### 💰 料金比較と自動チェックイン

- **サイト間モデル価格比較**：同じモデルの実質価格をサイト間で比較し、よりお得な接続先をすぐに見つけられます。
- **複数サイトの自動チェックイン**：対応サイトへワンクリックまたはスケジュールでチェックインし、毎日のログインなしで特典を受け取れます。

### 🚀 Web からのクイック取り込みとクライアント連携

- **Web ページからのクイック取り込み**：Web ページから Base URL と API Key を検出し、その場でテストして認証情報ライブラリへ保存できます。
- **クライアントへのワンクリックエクスポート**：CC Switch、Cherry Studio、Claude Code Router、Kilo Code、Roo Code、Kelivo、AI Toolbox、Cursor++ などのサポートされているエクスポートツールへ認証情報をすばやくエクスポートできます。

### 🧪 API 検証とトラブルシューティング

- **API・モデル検証**：ワンクリックで API の接続状態とモデルの利用可否を確認し、Key やモデルを実際に使えるかすぐに判断できます。
- **CLI 接続テスト**：一般的なコマンドラインツールから対象 API を利用できるか事前に確認し、設定後のトラブル調査を減らします。

### 🔔 お知らせとタスク結果通知

- **お知らせを一か所で確認**：登録済みサイトの各種お知らせを自動で集約・表示し、メンテナンス、モデル変更、価格改定などの更新もすぐに通知します。サイトを一つずつ確認する必要はありません。
- **タスク結果通知**：自動チェックイン、WebDAV 自動同期、モデル同期などの完了後、ブラウザまたは設定済みの通知先で結果を受け取り、失敗や異常にもすぐ対応できます。

### 🛠️ セルフホスト AI ゲートウェイ管理

- **主要 AI ゲートウェイを一元管理**：OmniRoute、CLIProxyAPI、New API、Sub2API、Magpie、gpt-load、AxonHub、Claude Code Hub、Octopus、Veloera、DoneHub のチャネルやプロバイダーを、個別の管理画面を開かずに拡張機能から直接管理できます。
- **ゲートウェイチャネルをすばやく作成**：保存済みのサイトアカウントや API 認証情報ライブラリの認証情報から、セルフホスト AI ゲートウェイのチャネルをすばやく作成できます。その後はゲートウェイ経由で各種モデルをまとめて呼び出し、チャネルを柔軟に切り替えられます。
- **モデル同期とリダイレクト**：対応サイトでは、チャネルのモデル一覧を手動またはスケジュールで自動同期し、上流のモデル変更に追従できます。モデルリダイレクトも自由に設定でき、クライアントでは任意のモデル名で呼び出せます。

### 🔐 データ保護とクラウド同期

- **ローカル優先**：API Key、アカウント、設定はデフォルトでブラウザ内に保存され、バックアップや同期を有効にした場合のみ WebDAV へ書き込まれます。
- **暗号化 WebDAV 自動同期**：暗号化と定期的な自動同期を有効にすると、複数デバイス間でデータを安全に同期し、パソコンを替えてもそのまま使い続けられます。

<a id="installation"></a>

## 🚀 クイックインストール

> [!IMPORTANT] > **ほとんどのユーザーにはストア版を推奨します。** インストールが簡単で、自動更新にも対応しています。

| チャネル            | インストールリンク                                                                                  | 現在のバージョン                                                                                                                                                                                                                                                                                                                          | ユーザー数                                                                                                                                                                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ストア | 公開後にリンクを追加 | — |

<details>
<summary>📦 手動インストールや Nightly ビルドが必要ですか？（クリックして展開）</summary>

| チャネル            | ダウンロードリンク                                                                      | 向いている用途                                                                       |
| ------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| GitHub Stable       | [Stable をダウンロード](https://github.com/jinchaoqiang0311/my-api-box/releases/latest)       | ストア版をインストールできない場合、または公開済み修正を一時的に手動導入したい場合   |
| Nightly pre-release | [Nightly をダウンロード](https://github.com/jinchaoqiang0311/my-api-box/releases/tag/nightly) | 新機能を早めに試し、テストに協力したい場合。ストア安定版より不安定な可能性があります |

GitHub Stable と Nightly は手動インストール用チャネルで、自動更新されません。新しいバージョン通知を受け取りたい場合は、リポジトリを Star / Watch してください。詳しくは インストールと更新ガイド を参照してください。

**その他の環境：**

- **モバイルブラウザ**：Edge モバイル版、Firefox for Android、Kiwi などに対応しています。詳しくは モバイルブラウザガイド を参照してください。
- **QQ Browser / 360 Browser など**：手動読み込みガイド を参照してください。
- **Safari (Mac)**：Xcode でのビルドが必要です。Safari インストールガイド を参照してください。

</details>

## 🧑‍🚀 30 秒クイックスタート

1. **拡張機能をインストール**：上記のストアリンクからインストールします。
2. **サイトにログイン**：普段使っている AI 中継サイトをブラウザで開いてログインします。
3. **自動検出を実行**：拡張機能アイコン -> `Add Account` -> サイト URL を入力 -> `Auto Detect` をクリックします。
4. **使い始める**：残高を確認し、自動チェックインを設定するか、アカウントを AI クライアントへエクスポートします。

👉 **図解付きの詳しい初心者ガイドを見る**

<a id="introduction-tech"></a>

### 🧩 高い互換性

どのアーキテクチャを使っていても、高い確率で対応しています。

- **アカウントサイト互換アーキテクチャ**：[New API](https://github.com/QuantumNous/new-api)、[Sub2API](https://github.com/Wei-Shaw/sub2api)、[One API](https://github.com/songquanpeng/one-api)、[one-hub](https://github.com/MartialBE/one-hub)、[Veloera](https://github.com/Veloera/Veloera)、[VoAPI / VoAPI v2](https://github.com/VoAPI/VoAPI)、[DoneHub](https://github.com/deanxv/done-hub)、[Super-API](https://github.com/SuperAI-Api/Super-API)、API易、ModelFlare、v-api、および Neo-API、RIX_API などの派生版。
- **セルフホスト型管理バックエンドと AI ゲートウェイ**：[OmniRoute](https://github.com/diegosouzapw/OmniRoute)、[CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI)、[New API](https://github.com/QuantumNous/new-api)、[Sub2API](https://github.com/Wei-Shaw/sub2api)、[Magpie](https://github.com/yetone/magpie)、[gpt-load](https://github.com/tbphp/gpt-load)、[AxonHub](https://github.com/looplj/axonhub)、[Claude Code Hub](https://github.com/ding113/claude-code-hub)、[Octopus](https://github.com/bestruirui/octopus)、[Veloera](https://github.com/Veloera/Veloera)、[DoneHub](https://github.com/deanxv/done-hub) など。チャネルやプロバイダーの管理に利用でき、対応サイトでは移行とモデル同期も行えます
  - Magpie、New API、Octopus、gpt-load、AxonHub の通常 API キーチャネル、CLIProxyAPI の OpenAI 互換リソースでは、同じサイトのキーをまとめてインポートできます。キーの振り分けは対象ゲートウェイが行います。 Magpie では同じアドレスとプロトコルの既存チャネルに未登録のキーを追加でき、既存の設定とモデル設定を保持します。
- **クライアントおよび開発ツールへのエクスポート**：CC Switch、Cherry Studio、Claude Code Router、Kilo Code、Roo Code、Kelivo、AI Toolbox、Cursor++ など、詳細は サポートされているエクスポートツールリスト
- **完全な一覧**：👉 対応サイト と サポートされているエクスポートツールリスト

<a id="ui-preview"></a>

## 🖼️ UI プレビュー

<table>
  <tr>
    <td align="center">
      <img src="docs/docs/static/image/en/account-manage.png" alt="account-manage" style="width:100%; height:auto;"/>
      <div>アカウント管理の概要</div>
    </td>
    <td align="center">
      <img src="docs/docs/static/image/en/model-list.png" alt="model-list" style="width:100%; height:auto;"/>
      <div>モデル一覧と価格</div>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="docs/docs/static/image/en/api-key-list.png" alt="api-key-list" style="width:100%; height:auto;"/>
      <div>キー一覧とエクスポート</div>
    </td>
    <td align="center">
      <img src="docs/docs/static/image/en/auto-check-in.png" alt="auto-check-in" style="width:100%; height:auto;"/>
      <div>自動チェックイン</div>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="docs/docs/static/image/en/account-model-usage-overview.png" alt="account-model-usage-overview" style="width:100%; height:auto;"/>
      <div>アカウント別モデル使用量の概要</div>
    </td>
    <td align="center">
      <img src="docs/docs/static/image/en/account-model-latency-overview.png" alt="account-model-latency-overview" style="width:100%; height:auto;"/>
      <div>アカウント別モデル遅延の概要</div>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="docs/docs/static/image/en/new-api-channel-sync.png" alt="new-api-channel-sync" style="width:100%; height:auto;"/>
      <div>New API モデル同期</div>
    </td>
    <td align="center">
      <img src="docs/docs/static/image/en/new-api-channel-manage.png" alt="new-api-channel-manage" style="width:100%; height:auto;"/>
      <div>New API チャネル管理</div>
    </td>
  </tr>
</table>

<a id="development-guide"></a>

## 🛠️ 開発ガイド

詳しくは [CONTRIBUTING](CONTRIBUTING.md) を参照してください。

<a id="license"></a>

## 📜 ライセンスと商用ライセンス

My API Box は GNU Affero General Public License v3.0 (AGPL-3.0) のもとで公開されています。


商用ライセンスの問い合わせ先：the upstream author (see the all-api-hub repository)

商用ライセンスは、My API Box のメンテナーが商用条件を付与する権利を持つコードとアセットにのみ適用されます。第三者依存関係、および過去に [One API Hub](https://github.com/fxaxg/one-api-hub) から派生した MIT ライセンス部分は、それぞれの著作権表示とライセンス条件に従います。詳しくは [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。

<a id="tech-stack"></a>

## 🏗️ 技術スタック

- **Framework**：[WXT](https://wxt.dev) がマルチブラウザ拡張機能のツールチェーンとビルドパイプラインを支えます
- **UI Layer**：[React](https://react.dev) がオプション画面とポップアップ体験を構築します
- **Language**：[TypeScript](https://www.typescriptlang.org) により、コードベース全体の型安全性を保ちます
- **Styling**：[Tailwind CSS](https://tailwindcss.com) がユーティリティファーストのテーマプリミティブを提供します
- **Components**：[Radix UI](https://www.radix-ui.com/) がデザインシステム向けのアクセシブルなプリミティブを提供します

<a id="community-ecosystem"></a>

## 🔗 エコシステムプロジェクト

My API Box を取り巻くコミュニティ拡張・連携プロジェクト：

| プロジェクト                                                | 概要                                               | 機能                                                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [Metapi](https://github.com/cita-777/metapi)                | セルフホスト型メタ集約ゲートウェイ                 | 複数の中継サイトアカウントを 1 つの API エントリにまとめます。My API Box が最初の着想元です。                 |
| [Fl API Hub](https://github.com/RebornQ/fl_api_hub)         | クロスプラットフォームのネイティブ管理クライアント | アカウント、残高、キーを管理し、クイックチェックインに対応します。My API Box から着想を得たプロジェクトです。 |
| [APIManager](https://github.com/zhalice2011/api-manager)    | ローカル AI API 集約プロキシ                       | My API Box からアカウントを同期し、統合プロキシ、ルーティング、使用状況ダッシュボードを提供します。           |

> My API Box をベースにしたプロジェクト、My API Box と連携するプロジェクト、または My API Box から着想を得たプロジェクトを開発した場合は、PR を作成してこの一覧に追加してください。

<a id="acknowledgements"></a>

## 🙏 謝辞

- [WXT](https://wxt.dev) - モダンなブラウザ拡張機能開発フレームワーク

<div align="center">
  <strong>⭐ このプロジェクトが役に立ったら、ぜひスターを付けてください！</strong>
</div>
