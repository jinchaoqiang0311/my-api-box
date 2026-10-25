import { describe, expect, it } from "vitest"

import { getSafeErrorMessage } from "~/services/apiService/sub2api/redaction"

describe("sub2api redaction", () => {
  it("redacts bearer tokens, JWTs, and OpenAI-style keys from Error messages", () => {
    const safeMessage = getSafeErrorMessage(
      new Error(
        "Authorization failed for Bearer abc123.token and eyJhbGciOiJIUzI1NiJ9.payload.signature using sk-secretkey12345",
      ),
    )

    expect(safeMessage).toContain("Bearer [REDACTED]")
    expect(safeMessage).toContain("[REDACTED_JWT]")
    expect(safeMessage).toContain("[REDACTED_KEY]")
    expect(safeMessage).not.toContain("abc123.token")
    expect(safeMessage).not.toContain("sk-secretkey12345")
  })

  it("accepts raw string errors and preserves non-secret text", () => {
    expect(
      getSafeErrorMessage("Request failed because the remote site is offline"),
    ).toBe("Request failed because the remote site is offline")
  })

  it("stringifies nullish and non-Error values safely", () => {
    expect(getSafeErrorMessage(null)).toBe("")
    expect(getSafeErrorMessage({ status: 500 })).toBe("[object Object]")
  })
})
