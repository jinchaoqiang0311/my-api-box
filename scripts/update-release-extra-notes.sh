#!/usr/bin/env bash

set -euo pipefail

RELEASE_TAG="${1:-${RELEASE_TAG:-}}"
REPOSITORY="${GH_REPO:-${GITHUB_REPOSITORY:-}}"
DOCS_BASE_URL="${DOCS_BASE_URL:-https://jinchaoqiang0311.github.io/my-api-box}"

if [ -z "$RELEASE_TAG" ]; then
  echo "RELEASE_TAG is required." >&2
  exit 1
fi

if [ -z "$REPOSITORY" ]; then
  echo "GH_REPO or GITHUB_REPOSITORY is required." >&2
  exit 1
fi

release_json="$(gh release view "$RELEASE_TAG" --repo "$REPOSITORY" --json body,assets)"

appendix_file="$(mktemp)"
current_body_file="$(mktemp)"
combined_file="$(mktemp)"

cleanup() {
  rm -f "$appendix_file" "$current_body_file" "$combined_file"
}
trap cleanup EXIT

export RELEASE_JSON="$release_json"
export RELEASE_TAG
export DOCS_BASE_URL

node --input-type=module <<'EOF' > "$appendix_file"
const release = JSON.parse(process.env.RELEASE_JSON ?? "{}")
const releaseTag = process.env.RELEASE_TAG ?? ""
const docsBaseUrl = (process.env.DOCS_BASE_URL ?? "").replace(/\/+$/, "")
const isNightly = releaseTag === "nightly"

const assetNames = Array.isArray(release.assets)
  ? release.assets
      .map((asset) => asset?.name)
      .filter((name) => typeof name === "string" && name.length > 0)
  : []

const assetOrder = (name) => {
  if (/chrome\.zip$/i.test(name)) return 10
  if (/firefox\.zip$/i.test(name)) return 20
  if (/sources\.zip$/i.test(name)) return 30
  if (/safari-xcode-bundle\.zip$/i.test(name)) return 40
  if (/safari\.zip$/i.test(name)) return 50
  return 100
}

const describeAsset = (name) => {
  if (/chrome\.zip$/i.test(name)) {
    return "Chromium 内核浏览器手动安装包。解压后在扩展管理页开启开发者模式 → 加载已解压的扩展程序。"
  }
  if (/firefox\.zip$/i.test(name)) {
    return "Firefox 构建包。解压后在 about:debugging 页面临时加载。"
  }
  if (/sources\.zip$/i.test(name)) {
    return "Firefox 发布/审核用源码包，通常不是普通用户直接安装的附件。"
  }
  if (/safari-xcode-bundle\.zip$/i.test(name)) {
    return "Safari 手动运行推荐包。解压后打开其中的 Xcode 工程运行。"
  }
  if (/safari\.zip$/i.test(name)) {
    return "Safari 原始构建包，通常作为 Xcode 工程生成输入使用。"
  }
  return "发布附件。"
}

const lines = [
  "<!-- my-api-box-release-extra:start -->",
  "## 附加说明",
  "",
  isNightly
    ? "> 当前为 Nightly 预发布，基于 `main` 最新提交自动生成。适合提前验证修复或协助测试；稳定性可能略差于正式版。"
    : "> 当前为正式版 Stable。",
  "",
  "### 安装方式",
  "商店版即将上架。在此之前请手动加载：",
  "1. 下载下方对应浏览器的 ZIP 附件。",
  "2. 解压。",
  "3. 在扩展管理页开启 **开发者模式** → 点击 **加载已解压的扩展程序** → 选择解压后的文件夹。",
  "",
  "### 使用说明",
  "- 手动安装不会自动更新，建议 Star / Watch 仓库以接收新版本通知。",
  "- Chrome / Edge / Kiwi 等 Chromium 浏览器：下载 `*-chrome.zip`，解压后加载已解压的扩展程序。",
  "- Firefox：下载 `*-firefox.zip`；`*-sources.zip` 为发布审核用源码包。",
  "- Safari：下载 `*-safari-xcode-bundle.zip`，解压后打开 Xcode 工程运行。",
  "",
  "### 文档链接",
  `- 快速上手：${docsBaseUrl}/get-started.html`,
  `- 安装与更新说明：${docsBaseUrl}/extension-update-install.html`,
  `- 常见问题：${docsBaseUrl}/faq.html`,
  `- 更新日志：${docsBaseUrl}/changelog.html`,
]

lines.push("", "### 产物说明")

if (assetNames.length === 0) {
  lines.push("- 当前 release 暂未检测到附件。")
} else {
  assetNames
    .sort((left, right) => {
      const delta = assetOrder(left) - assetOrder(right)
      return delta !== 0 ? delta : left.localeCompare(right)
    })
    .forEach((name) => {
      lines.push(`- \`${name}\`：${describeAsset(name)}`)
    })
}

lines.push("<!-- my-api-box-release-extra:end -->")

process.stdout.write(`${lines.join("\n")}\n`)
EOF

gh release view "$RELEASE_TAG" --repo "$REPOSITORY" --json body --jq ".body" > "$current_body_file"

perl -0pi -e 's/\n?<!-- my-api-box-release-extra:start -->.*?<!-- my-api-box-release-extra:end -->\n?//s' "$current_body_file"

cp "$current_body_file" "$combined_file"

if grep -q '[^[:space:]]' "$combined_file"; then
  printf '\n\n' >> "$combined_file"
else
  : > "$combined_file"
fi

cat "$appendix_file" >> "$combined_file"

gh release edit "$RELEASE_TAG" --repo "$REPOSITORY" --notes-file "$combined_file"
