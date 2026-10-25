import type { ExtensionStoreId } from "~/utils/browser"

// Legacy Chromium installs can use known runtime IDs for update eligibility.
// Marked builds use their baked distribution channel. Firefox's ID identifies
// the add-on, but does not distinguish AMO packages from self-distributed ones.
export const EXTENSION_STORE_IDS: Record<
  Exclude<ExtensionStoreId, "firefox">,
  string
> = {
  chrome: "YOUR-CHROME-EXTENSION-ID",
  edge: "YOUR-EDGE-EXTENSION-ID",
}

export const EXTENSION_STORE_LISTING_URLS: Record<ExtensionStoreId, string> = {
  chrome:
    "https://chromewebstore.google.com/detail/YOUR-CHROME-EXTENSION-ID",
  edge: "https://microsoftedge.microsoft.com/addons/detail/YOUR-EDGE-EXTENSION-ID",
  firefox:
    "https://addons.mozilla.org/firefox/addon/{YOUR-AMO-SLUG}",
}
