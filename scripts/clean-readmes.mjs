/**
 * Strip upstream promotional content from the four README files while
 * preserving the AGPL 5(a) modification notice (one minimal attribution
 * line) and all license notices. Removes: sponsor/affiliate section, store
 * placeholder badges, community badges, docs-site links, upstream release
 * links (repointed to this repo), upstream commercial-offer email, upstream
 * community acknowledgements.
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILES = ["README.md", "README_CN.md", "README_EN.md", "README_JA.md"];

const ATTR = {
  "README.md":
    "> Based on [all-api-hub](https://github.com/qixing-jk/all-api-hub) (AGPL-3.0), rebranded and modified as **My API Box**. Source is open under the same license; see LICENSE and THIRD_PARTY_NOTICES.md.",
  "README_EN.md":
    "> Based on [all-api-hub](https://github.com/qixing-jk/all-api-hub) (AGPL-3.0), rebranded and modified as **My API Box**. Source is open under the same license; see LICENSE and THIRD_PARTY_NOTICES.md.",
  "README_CN.md":
    "> 基于 [all-api-hub](https://github.com/qixing-jk/all-api-hub)(AGPL-3.0)修改而成,品牌为 **My API Box**;源码依同许可证开放,见 LICENSE 与 THIRD_PARTY_NOTICES.md。",
  "README_JA.md":
    "> [all-api-hub](https://github.com/qixing-jk/all-api-hub)(AGPL-3.0)をベースに改変した **My API Box** です。ソースコードは同一ライセンスで公開しています(LICENSE / THIRD_PARTY_NOTICES.md 参照)。",
};

const SPONSOR_ANCHOR = /^<a id="sponsors"><\/a>\s*$/;
const SPONSOR_HEADING = /^## .*(Sponsors|赞助|スポンサー)/;
const LICENSE_HEADING = /^## .*(License|许可|ライセンス)/;
const ACK_HEADING = /^## .*(Acknowledgements|致谢|謝辞)/;
const BADGE_BLOCK = /YOUR-CHROME|YOUR-EDGE|YOUR-AMO|linux\.do|t\.me\/|WeChat/i;
const DOCS_LINK = /\[([^\]]*)\]\(https:\/\/all-api-hub\.qixing1217\.top[^)]*\)/g;

let report = [];

for (const file of FILES) {
  const lines = readFileSync(file, "utf8").split("\n");
  const out = [];
  let mode = "normal";
  let removed = { sponsors: 0, badges: 0, docsLinks: 0, releaseLinks: 0, ack: 0 };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Sponsor section: from its anchor/heading until the next non-sponsor "## " heading.
    if (mode === "normal" && (SPONSOR_ANCHOR.test(line) || SPONSOR_HEADING.test(line))) {
      mode = "sponsor";
      removed.sponsors++;
      continue;
    }
    if (mode === "sponsor") {
      const isRealHeading = /^## /.test(line) && !SPONSOR_HEADING.test(line);
      if (isRealHeading) {
        mode = "normal";
        // fall through to process this heading line normally
      } else {
        removed.sponsors++;
        continue;
      }
    }

    // Badge blocks (<p align="center"> … </p>) with store/community badges.
    if (/^<p align="center">\s*$/.test(line)) {
      let j = i;
      let block = "";
      while (j < lines.length && !/<\/p>\s*$/.test(lines[j])) block += lines[j++] + "\n";
      block += lines[j] ?? "";
      if (BADGE_BLOCK.test(block)) {
        removed.badges++;
        i = j; // skip whole block
        continue;
      }
    }

    // Standalone quick-link lines that consist solely of docs-site links.
    if (/^\*\*\[⚡/.test(line) && line.includes("qixing1217.top")) {
      removed.docsLinks++;
      continue;
    }

    let out2 = line
      // Inline docs links → plain text.
      .replace(DOCS_LINK, "$1")
      // Upstream release links → this repo's releases.
      .replace(/https:\/\/github\.com\/qixing-jk\/all-api-hub\/releases/g, () => {
        removed.releaseLinks++;
        return "https://github.com/jinchaoqiang0311/my-api-box/releases";
      });

    // Commercial-offer paragraph: drop the upstream author's email lines.
    if (/street-anime-olive@duck\.com/.test(out2)) {
      out2 = out2
        .replace(/<street-anime-olive@duck\.com>/g, "the upstream author (see the all-api-hub repository)")
        .replace(/For commercial licensing, contact: .*/,"For commercial licensing beyond AGPL-3.0 (closed-source or white-label use of upstream code), contact the upstream author of all-api-hub.");
    }

    // Acknowledgements: drop upstream community/logo credits.
    if (/AngleNaris|linux\.do|Linux\.do/.test(out2)) {
      removed.ack++;
      continue;
    }

    out.push(out2);
  }

  // Collapse the attribution blockquote to the minimal one-liner.
  let text = out.join("\n");
  text = text.replace(
    /> \*\*(?:About this project|关于本项目|About this project \(このプロジェクトについて\))\*\*:[^\n]+/,
    ATTR[file],
  );

  writeFileSync(file, text);
  report.push(`${file}: sponsors ${removed.sponsors} lines, badge blocks ${removed.badges}, docs links ${removed.docsLinks}, release links ${removed.releaseLinks}, ack lines ${removed.ack}`);
}

console.log(report.join("\n"));
