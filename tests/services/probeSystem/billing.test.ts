import { afterEach, describe, expect, it, vi } from "vitest"

import {
  BASELINE_COMPLETION_RATIO,
  compareBillingAmounts,
  computeSiteExpectedUsd,
  fetchSiteBillingBasis,
} from "~/services/probeSystem/billing"
import { billingProbe } from "~/services/probeSystem/probes"

const credentials = {
  baseUrl: "https://relay.example.com",
  apiKey: "sk-test",
  model: "gpt-4o",
  accessToken: "admin-token",
  remoteUserId: "42",
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("computeSiteExpectedUsd", () => {
  it("uses model and completion ratios plus group multiplier", () => {
    expect(
      computeSiteExpectedUsd({
        promptTokens: 1000,
        completionTokens: 1000,
        row: { quota_type: 0, model_ratio: 0.5, completion_ratio: 1.2 },
        groupRatio: 0.8,
      }),
    ).toBe(0.00088)
  })

  it("uses per-call pricing instead of token math", () => {
    expect(
      computeSiteExpectedUsd({
        promptTokens: 1000,
        completionTokens: 1000,
        row: { quota_type: 1, model_price: 0.003 },
        groupRatio: 0.5,
      }),
    ).toBe(0.0015)
  })

  it("falls back to the historical completion ratio when omitted", () => {
    expect(
      computeSiteExpectedUsd({
        promptTokens: 1000,
        completionTokens: 1000,
        row: { quota_type: 0, model_ratio: 1 },
      }),
    ).toBe(
      Number(
        ((1000 + 1000 * BASELINE_COMPLETION_RATIO) / 1_000_000).toFixed(6),
      ),
    )
  })

  it("preserves free model and free group multipliers", () => {
    expect(
      computeSiteExpectedUsd({
        promptTokens: 1000,
        completionTokens: 1000,
        row: { quota_type: 0, model_ratio: 0, completion_ratio: 0 },
        groupRatio: 0,
      }),
    ).toBe(0)
  })

  it("returns null when a token-priced row has no model ratio", () => {
    expect(
      computeSiteExpectedUsd({
        promptTokens: 1000,
        completionTokens: 1000,
        row: { quota_type: 0 },
      }),
    ).toBeNull()
  })
})

describe("compareBillingAmounts", () => {
  it("accepts a normal site-priced charge", () => {
    expect(compareBillingAmounts(0.001, 0.001)).toBe("ok")
    expect(compareBillingAmounts(0.0007, 0.001)).toBe("ok")
  })

  it("flags a site-priced undercharge below the discount threshold", () => {
    expect(compareBillingAmounts(0.002, 0.003)).toBe("under")
  })

  it("flags overcharge against site or baseline expectations", () => {
    expect(compareBillingAmounts(0.00131, 0.001)).toBe("over")
  })

  it("treats zero expected cost as free until a real charge appears", () => {
    expect(compareBillingAmounts(0, 0)).toBe("ok")
    expect(compareBillingAmounts(0.0005, 0)).toBe("ok")
    expect(compareBillingAmounts(0.0011, 0)).toBe("over")
  })
})

describe("fetchSiteBillingBasis", () => {
  it("uses the matching user's group ratio and preserves free call price", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  model_name: "free-model",
                  quota_type: 1,
                  model_price: 0,
                  model_ratio: 0,
                },
              ],
              group_ratio: { vip: 0, default: 1 },
            }),
            { status: 200 },
          ),
      ),
    )

    const basis = await fetchSiteBillingBasis(
      "https://relay.example.com/",
      "free-model",
      "vip",
      { accessToken: "token", remoteUserId: "123" },
    )

    expect(basis).toEqual({
      row: {
        model_name: "free-model",
        quota_type: 1,
        model_price: 0,
        model_ratio: 0,
      },
      groupRatio: 0,
    })
    expect(fetch).toHaveBeenCalledWith(
      "https://relay.example.com/api/pricing",
      {
        headers: { Authorization: "token", "New-Api-User": "123" },
      },
    )
  })

  it("falls back to the default group ratio", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: [{ model_name: "gpt-4o", quota_type: 0, model_ratio: 1 }],
              group_ratio: { default: 0.8 },
            }),
            { status: 200 },
          ),
      ),
    )

    const basis = await fetchSiteBillingBasis(
      "https://relay.example.com",
      "gpt-4o",
      "missing-group",
    )
    expect(basis?.groupRatio).toBe(0.8)
  })

  it("returns null when the public pricing response lacks the model", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ data: [], group_ratio: { default: 1 } }),
            {
              status: 200,
            },
          ),
      ),
    )

    await expect(
      fetchSiteBillingBasis(
        "https://relay.example.com",
        "missing-model",
        undefined,
      ),
    ).resolves.toBeNull()
  })
})

describe("billingProbe", () => {
  it("compares the actual deduction against the site's model and group price", async () => {
    // correct delta = (1000 + 1000*1.2) * 0.5 * 0.8 / 1M * 500k = 440 points
    const quotaValues = [1_000_000, 999_560]
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/api/user/self")) {
        const quota = quotaValues.shift()
        return new Response(JSON.stringify({ data: { quota, group: "vip" } }), {
          status: 200,
        })
      }
      if (url.endsWith("/v1/chat/completions")) {
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "4" } }],
            usage: { prompt_tokens: 1000, completion_tokens: 1000 },
          }),
          { status: 200 },
        )
      }
      if (url.endsWith("/api/pricing")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                model_name: "gpt-4o",
                quota_type: 0,
                model_ratio: 0.5,
                completion_ratio: 1.2,
              },
            ],
            group_ratio: { vip: 0.8, default: 1 },
          }),
          { status: 200 },
        )
      }
      return new Response("not found", { status: 404 })
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await billingProbe.run(credentials)

    expect(result.verdict).toBe("pass")
    expect(result.summaryKey).toBe("summaries.billingOk")
    expect(result.evidence).toMatchObject({
      deductedUsd: 0.00088,
      expectedUsd: 0.00088,
      basis: "site",
      comparison: "ok",
    })
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it("falls back to the baseline and labels that comparison when list price is unavailable", async () => {
    // correct delta = (1000 + 1000*1.3) / 1M * 500k = 1150 points
    const quotaValues = [1_000_000, 998_850]
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith("/api/user/self")) {
          return new Response(
            JSON.stringify({
              data: { quota: quotaValues.shift(), group: "default" },
            }),
            { status: 200 },
          )
        }
        if (url.endsWith("/v1/chat/completions")) {
          return new Response(
            JSON.stringify({
              choices: [{ message: { content: "4" } }],
              usage: { prompt_tokens: 1000, completion_tokens: 1000 },
            }),
            { status: 200 },
          )
        }
        return new Response("unavailable", { status: 503 })
      }),
    )

    const result = await billingProbe.run(credentials)
    expect(result.verdict).toBe("pass")
    expect(result.summaryKey).toBe("summaries.billingOkBaseline")
    expect(result.evidence).toMatchObject({
      basis: "baseline",
      expectedUsd: 0.0023,
    })
  })
})
