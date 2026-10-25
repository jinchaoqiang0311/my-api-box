import { describe, expect, it } from "vitest"

import {
  LDOH_ORIGIN,
  LDOH_SITE_SEARCH_QUERY_PARAM,
} from "~/services/integrations/ldohSiteLookup/constants"
import {
  buildLdohSiteSearchUrlFromUrl,
  normalizeUrlForLdohMatch,
} from "~/services/integrations/ldohSiteLookup/url"

describe("ldohSiteLookup url helpers", () => {
  it("normalizes mixed-case and scheme-less URLs to lowercase origin and hostname", () => {
    expect(
      normalizeUrlForLdohMatch("API.Example.com/v1/models?token=secret#hash"),
    ).toEqual({
      origin: "https://api.example.com",
      hostname: "api.example.com",
    })
  })

  it("returns null parts and no search URL for unsupported or invalid inputs", () => {
    expect(normalizeUrlForLdohMatch("ftp://api.example.com")).toEqual({
      origin: null,
      hostname: null,
    })
    expect(buildLdohSiteSearchUrlFromUrl("ftp://api.example.com")).toBeNull()
  })

  it("builds a lowercased LDOH search URL from a valid account URL", () => {
    const searchUrl = buildLdohSiteSearchUrlFromUrl(
      "HTTPS://Api.Example.com/v1/models",
    )

    expect(searchUrl).not.toBeNull()

    const parsed = new URL(searchUrl!)
    expect(parsed.origin).toBe(new URL(LDOH_ORIGIN).origin)
    expect(parsed.searchParams.get(LDOH_SITE_SEARCH_QUERY_PARAM)).toBe(
      "api.example.com",
    )
  })
})
