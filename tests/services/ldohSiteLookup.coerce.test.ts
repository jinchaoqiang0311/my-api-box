import { describe, expect, it } from "vitest"

import {
  coerceLdohSiteListCache,
  coerceLdohSiteSummaryList,
} from "~/services/integrations/ldohSiteLookup/coerce"

describe("ldohSiteLookup coerce", () => {
  it("filters invalid items, trims fields, and de-duplicates by id", () => {
    expect(
      coerceLdohSiteSummaryList([
        null,
        { id: "  site-1  ", apiBaseUrl: " https://api.example.com/v1  " },
        {
          id: "site-1",
          name: "Duplicate",
          apiBaseUrl: "https://ignored.example.com",
        },
        {
          id: " site-2 ",
          name: " Example Site ",
          apiBaseUrl: " https://api2.example.com ",
        },
        { id: "missing-url" },
        { apiBaseUrl: "https://missing-id.example.com" },
      ]),
    ).toEqual([
      {
        id: "site-1",
        apiBaseUrl: "https://api.example.com/v1",
      },
      {
        id: "site-2",
        name: "Example Site",
        apiBaseUrl: "https://api2.example.com",
      },
    ])
  })

  it("treats non-array summary payloads as empty", () => {
    expect(coerceLdohSiteSummaryList(null)).toEqual([])
    expect(coerceLdohSiteSummaryList({ items: [] })).toEqual([])
  })

  it("rejects invalid cache payloads and keeps only valid coerced items", () => {
    expect(coerceLdohSiteListCache(null)).toBeNull()
    expect(
      coerceLdohSiteListCache({
        version: 2,
        fetchedAt: 1,
        expiresAt: 2,
        items: [],
      }),
    ).toBeNull()
    expect(
      coerceLdohSiteListCache({
        version: 1,
        fetchedAt: 0,
        expiresAt: 2,
        items: [],
      }),
    ).toBeNull()
    expect(
      coerceLdohSiteListCache({
        version: 1,
        fetchedAt: 10,
        expiresAt: 9,
        items: [],
      }),
    ).toBeNull()

    expect(
      coerceLdohSiteListCache({
        version: 1,
        fetchedAt: 10,
        expiresAt: 20,
        items: [
          { id: " site-1 ", apiBaseUrl: " https://api.example.com " },
          { id: "site-1", apiBaseUrl: "https://duplicate.example.com" },
          { id: "", apiBaseUrl: "https://invalid.example.com" },
        ],
      }),
    ).toEqual({
      version: 1,
      fetchedAt: 10,
      expiresAt: 20,
      items: [{ id: "site-1", apiBaseUrl: "https://api.example.com" }],
    })
  })
})
