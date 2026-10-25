import { describe, expect, it, vi } from "vitest"

import { compareBaselines } from "~/services/probeSystem/consistency"
import {
  cacheProbe,
  familyOf,
  identityProbe,
} from "~/services/probeSystem/probes"
import { PROBE_IDS } from "~/services/probeSystem/types"

const CREDENTIALS = {
  baseUrl: "https://relay.example.com",
  apiKey: "sk-test",
  model: "gpt-4o",
}

function chatResponse(content: string, body?: Record<string, unknown>) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
      ...body,
    }),
    { status: 200 },
  )
}

describe("familyOf", () => {
  it("detects the gpt family", () => {
    expect(familyOf("gpt-4o-mini")).toBe("gpt")
    expect(familyOf("o3-mini")).toBe("gpt")
    expect(familyOf("chatgpt-4o-latest")).toBe("gpt")
  })

  it("detects claude and gemini families", () => {
    expect(familyOf("claude-sonnet-4")).toBe("claude")
    expect(familyOf("gemini-2.5-pro")).toBe("gemini")
  })

  it("returns other for unknown families", () => {
    expect(familyOf("deepseek-v3")).toBe("other")
  })
})

describe("identityProbe", () => {
  it("flags a family mismatch as suspect", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        chatResponse("MODEL=claude-3-7-sonnet\nCUTOFF=2025-02"),
      ),
    )
    const result = await identityProbe.run(CREDENTIALS)
    expect(result.verdict).toBe("suspect")
    expect(result.summaryKey).toBe("summaries.identityMismatch")
    vi.unstubAllGlobals()
  })

  it("passes when the self-reported family matches", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => chatResponse("MODEL=gpt-4o\nCUTOFF=2023-10")),
    )
    const result = await identityProbe.run(CREDENTIALS)
    expect(result.verdict).toBe("pass")
    vi.unstubAllGlobals()
  })

  it("reports unknown when the model refuses to self-report", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => chatResponse("I cannot answer")),
    )
    const result = await identityProbe.run(CREDENTIALS)
    expect(result.verdict).toBe("unknown")
    vi.unstubAllGlobals()
  })
})

describe("cacheProbe", () => {
  it("fails when the second call replays the first answer", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(chatResponse("NXAAA111"))
      .mockResolvedValueOnce(chatResponse("NXAAA111"))
    vi.stubGlobal("fetch", fetchMock)
    const result = await cacheProbe.run(CREDENTIALS)
    expect(result.verdict).toBe("fail")
    expect(result.summaryKey).toBe("summaries.cacheHit")
    vi.unstubAllGlobals()
  })

  it("passes when each call echoes its own nonce", async () => {
    const fetchMock = vi.fn(async (_url, init) => {
      const match =
        /Repeat back exactly this code and nothing else: ([A-Z0-9]+)/.exec(
          String(init?.body ?? ""),
        )
      return chatResponse(match?.[1] ?? "")
    })
    vi.stubGlobal("fetch", fetchMock)
    const result = await cacheProbe.run(CREDENTIALS)
    expect(result.verdict).toBe("pass")
    vi.unstubAllGlobals()
  })
})

describe("compareBaselines", () => {
  const base = {
    claimed: "gpt-4o",
    cutoff: "2023-10",
    answerHash: "abc12345",
    ttftMs: 900,
    at: 1,
  }

  it("detects a claimed-identity drift", () => {
    expect(compareBaselines(base, { ...base, claimed: "gpt-4o-mini" })).toEqual(
      { drifted: true, field: "claimed" },
    )
  })

  it("detects an answer drift with the same identity", () => {
    expect(compareBaselines(base, { ...base, answerHash: "ffff0000" })).toEqual(
      { drifted: true, field: "answerHash" },
    )
  })

  it("flags a large latency jump as drift", () => {
    expect(compareBaselines(base, { ...base, ttftMs: 9000 })).toEqual({
      drifted: true,
      field: "ttftMs",
    })
  })

  it("stays stable for an equivalent baseline", () => {
    expect(compareBaselines(base, { ...base, at: 2 })).toEqual({
      drifted: false,
    })
  })
})

describe("probe ids", () => {
  it("exposes exactly the seven documented probes", () => {
    expect(Object.values(PROBE_IDS)).toHaveLength(7)
  })
})
