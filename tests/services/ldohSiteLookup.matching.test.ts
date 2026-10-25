import { describe, expect, it } from "vitest"

import {
  buildLdohSiteLookupIndex,
  matchLdohSiteForAccount,
} from "~/services/integrations/ldohSiteLookup/matching"

describe("ldohSiteLookup matching", () => {
  it("skips invalid directory URLs when building the lookup index", () => {
    const index = buildLdohSiteLookupIndex([
      { id: "valid", apiBaseUrl: "https://api.example.com/" },
      { id: "invalid", apiBaseUrl: "not a valid url" },
    ])

    expect(Array.from(index.byOrigin.entries())).toEqual([
      [
        "https://api.example.com",
        [{ id: "valid", apiBaseUrl: "https://api.example.com/" }],
      ],
    ])
    expect(Array.from(index.byHostname.entries())).toEqual([
      [
        "api.example.com",
        [{ id: "valid", apiBaseUrl: "https://api.example.com/" }],
      ],
    ])
  })

  it("prefers exact origin matches", () => {
    const index = buildLdohSiteLookupIndex([
      { id: "https", apiBaseUrl: "https://api.example.com/" },
      { id: "http", apiBaseUrl: "http://api.example.com/" },
    ])

    const match = matchLdohSiteForAccount(index, "https://api.example.com/v1")
    expect(match?.id).toBe("https")
  })

  it("falls back to hostname only when unique", () => {
    const index = buildLdohSiteLookupIndex([
      { id: "site-1", apiBaseUrl: "https://api.example.com/" },
    ])

    const match = matchLdohSiteForAccount(index, "http://api.example.com")
    expect(match?.id).toBe("site-1")
  })

  it("treats multiple hostname matches as no match", () => {
    const index = buildLdohSiteLookupIndex([
      { id: "a", apiBaseUrl: "https://api.example.com/" },
      { id: "b", apiBaseUrl: "http://api.example.com/" },
    ])

    const match = matchLdohSiteForAccount(
      index,
      "https://api.example.com:8443/v1",
    )
    expect(match).toBeNull()
  })

  it("matches by exact origin even when hostname is ambiguous", () => {
    const index = buildLdohSiteLookupIndex([
      { id: "a", apiBaseUrl: "https://api.example.com/" },
      { id: "b", apiBaseUrl: "http://api.example.com/" },
    ])

    const match = matchLdohSiteForAccount(index, "https://api.example.com/path")
    expect(match?.id).toBe("a")
  })

  it("treats multiple exact-origin matches as no match", () => {
    const index = buildLdohSiteLookupIndex([
      { id: "a", apiBaseUrl: "https://api.example.com/" },
      { id: "b", apiBaseUrl: "https://api.example.com/v1" },
    ])

    const match = matchLdohSiteForAccount(index, "https://api.example.com/path")
    expect(match).toBeNull()
  })
})
