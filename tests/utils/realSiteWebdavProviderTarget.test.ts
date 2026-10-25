import { describe, expect, it } from "vitest"

import { resolveWebdavProviderTargetUrl } from "~~/e2e/utils/realSite/webdavProviderTarget"

describe("resolveWebdavProviderTargetUrl", () => {
  it("preserves an explicit test-only JSON file URL", () => {
    expect(
      resolveWebdavProviderTargetUrl(
        "https://webdav.example.invalid/test-space/aah-e2e.json",
      ),
    ).toBe("https://webdav.example.invalid/test-space/aah-e2e.json")
  })

  it.each([
    "https://webdav.example.invalid/test-space",
    "https://webdav.example.invalid/test-space/",
  ])("resolves a directory URL to the product backup target: %s", (url) => {
    expect(resolveWebdavProviderTargetUrl(url)).toBe(
      "https://webdav.example.invalid/test-space/all-api-hub-backup/all-api-hub-1-0.json",
    )
  })
})
