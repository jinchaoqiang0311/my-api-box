import { beforeEach, describe, expect, it, vi } from "vitest"

import { safeRandomUUID } from "~/utils/core/identifier"

const { loggerMocks } = vi.hoisted(() => ({
  loggerMocks: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock("~/utils/core/logger", () => ({
  createLogger: () => loggerMocks,
}))

describe("identifier", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("falls back to a timestamp-based identifier when crypto.randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {})
    vi.spyOn(Date, "now").mockReturnValue(123456789)
    vi.spyOn(Math, "random").mockReturnValue(0.123456789)

    const id = safeRandomUUID("acct")

    expect(id).toMatch(/^acct-123456789-[a-z0-9]+$/)
    expect(loggerMocks.warn).not.toHaveBeenCalled()
  })

  it("returns the native UUID as-is when no prefix is provided", () => {
    const randomUUID = vi.fn(() => "native-uuid")

    vi.stubGlobal("crypto", { randomUUID })

    expect(safeRandomUUID()).toBe("native-uuid")
    expect(randomUUID).toHaveBeenCalledTimes(1)
    expect(loggerMocks.warn).not.toHaveBeenCalled()
  })

  it("logs and falls back when crypto.randomUUID throws", () => {
    const randomUUID = vi.fn(() => {
      throw new Error("illegal invocation")
    })

    vi.stubGlobal("crypto", { randomUUID })
    vi.spyOn(Date, "now").mockReturnValue(987654321)
    vi.spyOn(Math, "random").mockReturnValue(0.987654321)

    const id = safeRandomUUID("acct")

    expect(randomUUID).toHaveBeenCalledTimes(1)
    expect(id).toMatch(/^acct-987654321-[a-z0-9]+$/)
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      "Failed to generate UUID using crypto.randomUUID",
      expect.objectContaining({
        message: "illegal invocation",
      }),
    )
  })
})
