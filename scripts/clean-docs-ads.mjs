/** One-shot docs/feed de-promotion for the My API Box fork. */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"

// 1. Empty announcements + community channels.
{
  const j = JSON.parse(
    readFileSync("public/product-announcements.json", "utf8"),
  )
  console.log("announcements before:", j.announcements.length)
  j.announcements = []
  if (j._examples) j._examples = {}
  writeFileSync("public/product-announcements.json", JSON.stringify(j, null, 2))

  const c = JSON.parse(
    readFileSync("public/community-resources.v1.json", "utf8"),
  )
  console.log("channels before:", (c.channels ?? []).length)
  c.channels = []
  writeFileSync(
    "public/community-resources.v1.json",
    JSON.stringify(c, null, 2),
  )
}

// 2. Strip affiliate/UTM parameters from every docs markdown file.
const seen = []
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = `${dir}/${name}`
    if (statSync(path).isDirectory()) {
      walk(path)
      continue
    }
    if (!name.endsWith(".md")) continue
    let text = readFileSync(path, "utf8")
    const before = text
    text = text
      .replace(
        /([?&])(aff|invitecode|invite_code|utm_campaign|utm_content|utm_medium|utm_source|utm_term)=[^&)#\s"']*/gi,
        "$1",
      )
      .replace(/\?&+/g, "?")
      .replace(/\?(?=[)\s"']|$)/g, "")
    if (text !== before) {
      writeFileSync(path, text)
      seen.push(path)
    }
  }
}
walk("docs/docs")
console.log("aff-stripped files:", seen.length)
seen.forEach((f) => console.log("  ", f))
