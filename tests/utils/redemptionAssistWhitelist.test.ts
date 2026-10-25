import { describe, expect, it } from "vitest"

import {
  buildOriginWhitelistPattern,
  buildUrlPrefixWhitelistPattern,
  isUrlAllowedByRegexList,
} from "~/utils/core/urlWhitelist"

describe("redemptionAssistWhitelist", () => {
  describe("buildOriginWhitelistPattern", () => {
    it("creates a pattern that matches any URL under the same origin", () => {
      const pattern = buildOriginWhitelistPattern("https://example.com/abc")
      expect(pattern).toBeTruthy()

      expect(isUrlAllowedByRegexList("https://example.com/", [pattern!])).toBe(
        true,
      )
      expect(
        isUrlAllowedByRegexList("https://example.com/console/topup", [
          pattern!,
        ]),
      ).toBe(true)
      expect(isUrlAllowedByRegexList("https://other.com/", [pattern!])).toBe(
        false,
      )
    })

    it("returns null for invalid urls", () => {
      expect(buildOriginWhitelistPattern("not-a-url")).toBeNull()
    })
  })

  describe("buildUrlPrefixWhitelistPattern", () => {
    it("creates a pattern that matches the same origin+path and allows query/hash", () => {
      const pattern = buildUrlPrefixWhitelistPattern(
        "https://example.com/console/topup?x=1#hash",
      )
      expect(pattern).toBeTruthy()

      expect(
        isUrlAllowedByRegexList("https://example.com/console/topup", [
          pattern!,
        ]),
      ).toBe(true)
      expect(
        isUrlAllowedByRegexList("https://example.com/console/topup/?a=b", [
          pattern!,
        ]),
      ).toBe(true)
      expect(
        isUrlAllowedByRegexList("https://example.com/console/log", [pattern!]),
      ).toBe(false)
    })

    it("returns null for invalid urls", () => {
      expect(buildUrlPrefixWhitelistPattern("/relative/path")).toBeNull()
    })
  })

  describe("isUrlAllowedByRegexList", () => {
    it("ignores invalid patterns", () => {
      expect(
        isUrlAllowedByRegexList("https://example.com", [
          "(",
          "^https://example\\.com$",
        ]),
      ).toBe(true)
    })

    it("returns false when url is empty", () => {
      expect(isUrlAllowedByRegexList("", [".*"])).toBe(false)
    })

    it("returns false when the candidate url is missing", () => {
      expect(isUrlAllowedByRegexList(undefined as any, [".*"])).toBe(false)
    })

    it("returns false when the pattern list is missing", () => {
      expect(
        isUrlAllowedByRegexList("https://example.com", undefined as any),
      ).toBe(false)
    })

    it("skips null and blank pattern entries before matching later valid rules", () => {
      expect(
        isUrlAllowedByRegexList("https://example.com", [
          null as any,
          "   ",
          "^https://example\\.com$",
        ]),
      ).toBe(true)
    })
  })
})
