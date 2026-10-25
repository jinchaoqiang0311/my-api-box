import { describe, expect, it } from "vitest"

import {
  extractSessionCookieHeader,
  mergeCookieHeaders,
  normalizeCookieHeaderValue,
  parseCookieHeader,
} from "~/utils/browser/cookieString"

describe("cookieString", () => {
  describe("normalizeCookieHeaderValue", () => {
    it("strips a leading Cookie: prefix", () => {
      expect(normalizeCookieHeaderValue("Cookie: a=1; b=2")).toBe("a=1; b=2")
      expect(normalizeCookieHeaderValue("cookie: a=1")).toBe("a=1")
      expect(normalizeCookieHeaderValue("  COOKIE :   a=1  ")).toBe("a=1")
    })

    it("returns an empty string for whitespace-only values", () => {
      expect(normalizeCookieHeaderValue("   ")).toBe("")
    })
  })

  describe("parseCookieHeader", () => {
    it("parses Cookie: prefixed values", () => {
      const map = parseCookieHeader("Cookie: a=1; b=2")
      expect(map.get("a")).toBe("1")
      expect(map.get("b")).toBe("2")
    })

    it("ignores empty and malformed cookie segments", () => {
      const map = parseCookieHeader("Cookie: a=1;; invalid; =oops; b=2;")

      expect(Array.from(map.entries())).toEqual([
        ["a", "1"],
        ["b", "2"],
      ])
    })
  })

  describe("extractSessionCookieHeader", () => {
    it("returns only the session cookie when present", () => {
      expect(extractSessionCookieHeader("session=abc; foo=1")).toBe(
        "session=abc",
      )
      expect(extractSessionCookieHeader("foo=1; session=abc")).toBe(
        "session=abc",
      )
    })

    it("handles Cookie: prefixed values", () => {
      expect(extractSessionCookieHeader("Cookie: session=abc; foo=1")).toBe(
        "session=abc",
      )
    })

    it("falls back to the normalized header when session is missing", () => {
      expect(extractSessionCookieHeader("foo=1; bar=2")).toBe("foo=1; bar=2")
    })

    it("falls back to the normalized header when parsing finds no cookie pairs", () => {
      expect(
        extractSessionCookieHeader(
          "Cookie: invalid-fragment; still-not-a-cookie",
        ),
      ).toBe("invalid-fragment; still-not-a-cookie")
    })

    it("matches session cookie name case-insensitively", () => {
      expect(extractSessionCookieHeader("SESSION=abc; foo=1")).toBe(
        "SESSION=abc",
      )
    })
  })

  describe("mergeCookieHeaders", () => {
    it("returns an empty string when both inputs are empty", () => {
      expect(mergeCookieHeaders("", "")).toBe("")
    })

    it("overrides duplicate cookies and preserves the merged header order", () => {
      expect(mergeCookieHeaders("a=1; b=old", "b=new; c=3")).toBe(
        "a=1; b=new; c=3",
      )
    })
  })
})
