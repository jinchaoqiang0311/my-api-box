/**
 * Central branding constants used across the extension codebase.
 *
 * Keep these values stable because they can appear in:
 * - Extension metadata (manifest)
 * - Toolbar tooltip titles
 * - Fallback UI strings in non-extension environments (tests/jsdom)
 */
/**
 * Single source of truth for the product brand.
 *
 * Display surfaces (manifest, page titles, About page, README and store copy)
 * must read from these constants instead of repeating the brand name. Only the
 * brand identifier layer lives here; feature copy belongs to the i18n locales.
 */
export const APP_NAME = "StationWarden"

/** Repository and documentation entry points for this fork. */
export const APP_REPOSITORY_URL =
  "https://github.com/jinchaoqiang0311/my-api-box"
export const APP_REPOSITORY_NAME = "my-api-box"
export const APP_DOCS_URL = "https://jinchaoqiang0311.github.io/my-api-box/"

/** Upstream attribution required by AGPL-3.0. */
export const UPSTREAM_PROJECT_URL = "https://github.com/qixing-jk/all-api-hub"
export const APP_MODIFICATION_DATE = "2026-11-04"

/**
 * RelayLens (relay station rating site) public entry points.
 *
 * Site base is the deployed page root (not the bare domain): the whole site
 * lives under `/relay/`. `RELAYLENS_SUMMARY_API_PATH` is appended to this base,
 * so the lookup URL is `{SITE_URL}/api/v1/station/by-host/{host}/summary`.
 *
 * Verified on 2026-11-04: `/relay/` and `/relay/claim.html` return 200, while
 * both `/api/v1/...` and `/relay/api/v1/...` return 404 — the station summary
 * API is not deployed yet. Until it ships, the rating card shows "unavailable"
 * even though the site links work.
 *
 * TODO(release): no extension download page exists yet; keep the download
 * constant empty so the UI shows "link pending" instead of a guessed URL.
 */
export const RELAYLENS_SITE_URL = "https://aipaihangbang.cn/relay"
export const RELAYLENS_DOWNLOAD_URL = ""
/** Existing claim page (200 on 2026-11-04), used by the "not indexed" state. */
export const RELAYLENS_CLAIM_URL = "https://aipaihangbang.cn/relay/claim.html"

/** Path of the build-time static snapshot listing every indexed host. */
export const RELAYLENS_SUMMARY_INDEX_PATH = "/api-static/summary-index.json"
