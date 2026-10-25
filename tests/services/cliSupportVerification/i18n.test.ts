import { describe, expect, it, vi } from "vitest"

import {
  getCliSupportToolLabel,
  translateCliSupportSummary,
} from "~/services/verification/cliSupportVerification/i18n"

describe("cliSupportVerification i18n", () => {
  it.each([
    ["claude", "cliSupportVerification:verifyDialog.tools.claude"],
    ["codex", "cliSupportVerification:verifyDialog.tools.codex"],
    ["gemini", "cliSupportVerification:verifyDialog.tools.gemini"],
  ])("returns the correct label key for tool %s", (toolId, expectedKey) => {
    const t = vi.fn((key: string) => key)

    const result = getCliSupportToolLabel(t as any, toolId as any)

    expect(result).toBe(expectedKey)
    expect(t).toHaveBeenCalledWith(expectedKey)
  })

  it.each([
    "verifyDialog.summaries.supported",
    "verifyDialog.summaries.supportedStreaming",
    "verifyDialog.summaries.noToolCallDetected",
    "verifyDialog.summaries.toolCallSucceeded",
    "verifyDialog.summaries.unauthorized",
    "verifyDialog.summaries.forbidden",
    "verifyDialog.summaries.endpointNotFound",
    "verifyDialog.summaries.httpError",
    "verifyDialog.summaries.invalidResponse",
    "verifyDialog.summaries.networkError",
    "verifyDialog.summaries.unexpectedError",
    "verifyDialog.summaries.noModelIdProvided",
    "verifyDialog.summaries.unsupportedForApiType",
  ])("translates known summary key %s with forwarded params", (summaryKey) => {
    const params = { latencyMs: 123, status: 401 }
    const expectedKey = `cliSupportVerification:${summaryKey}`
    const t = vi.fn((key: string, forwardedParams?: Record<string, unknown>) =>
      JSON.stringify({ key, forwardedParams }),
    )

    const result = translateCliSupportSummary(t as any, summaryKey, params)

    expect(result).toBe(
      JSON.stringify({ key: expectedKey, forwardedParams: params }),
    )
    expect(t).toHaveBeenCalledWith(expectedKey, params)
  })

  it("returns undefined without calling t for unknown summary keys", () => {
    const t = vi.fn((key: string) => key)

    const result = translateCliSupportSummary(
      t as any,
      "verifyDialog.summaries.unknown",
      { status: 500 },
    )

    expect(result).toBeUndefined()
    expect(t).not.toHaveBeenCalled()
  })

  it("throws for unsupported tool ids", () => {
    const t = vi.fn((key: string) => key)

    expect(() => getCliSupportToolLabel(t as any, "warp" as any)).toThrow(
      "Unexpected CLI tool id: warp",
    )
  })
})
