import { afterEach, describe, expect, it, vi } from "vitest"

import {
  BASELINE_COMPLETION_RATIO,
  compareBillingAmounts,
  computeSiteExpectedUsd,
  fetchBillingLogRatio,
  fetchSiteBillingBasis,
  matchGroupRatioCandidate,
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
    ).toBe(0.00176)
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
      Number(((1000 + 1000 * BASELINE_COMPLETION_RATIO) / 500_000).toFixed(6)),
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

  it("prices a tiered_expr row from its USD/M coefficients, ignoring the placeholder ratio", () => {
    // Real memecode row: model_ratio 37.5 is a placeholder; the expression
    // prices fresh input at $2/M, cache reads at $0.1/M, output at $10/M.
    const row = {
      quota_type: 0,
      model_ratio: 37.5,
      completion_ratio: 2,
      billing_mode: "tiered_expr",
      billing_expr:
        'len <= 272000 ? tier("0_272k", p * 2 + cr * 0.1 + cc * 2.5 + c * 10) : tier("272k_plus", p * 4 + cr * 0.2 + cc * 5 + c * 15)',
    }
    expect(
      computeSiteExpectedUsd({
        promptTokens: 4399,
        completionTokens: 10,
        cachedTokens: 4224,
        row,
      }),
    ).toBe(0.000872)
    expect(
      computeSiteExpectedUsd({
        promptTokens: 4399,
        completionTokens: 10,
        cachedTokens: 4224,
        row,
        groupRatio: 0.3,
      }),
    ).toBe(0.000262)
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

  it("only absorbs integer-quota rounding, never a fixed dollar floor", () => {
    // $0.000004 = 2 quota points at the 500k exchange.
    expect(compareBillingAmounts(0, 0)).toBe("ok")
    expect(compareBillingAmounts(0.000004, 0)).toBe("ok")
    expect(compareBillingAmounts(0.0001, 0.001)).toBe("under")
    expect(compareBillingAmounts(0.0008, 0.001)).toBe("ok")
  })

  it("treats zero expected cost as free until a real charge appears", () => {
    expect(compareBillingAmounts(0, 0)).toBe("ok")
    expect(compareBillingAmounts(0.0005, 0)).toBe("over")
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
      groupRatioSource: "user",
      groupRatioKey: "vip",
      groupRatioOptions: [
        { key: "vip", value: 0 },
        { key: "default", value: 1 },
      ],
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
    expect(basis?.groupRatioSource).toBe("default")
    expect(basis?.groupRatioKey).toBe("default")
  })

  it("leaves channel-named group maps unresolved instead of guessing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: [
                {
                  model_name: "gpt-5.6-sol",
                  quota_type: 0,
                  model_ratio: 37.5,
                },
              ],
              // aicost-style map: channel names, not account tiers. A median
              // here happens to be 1, which would silently claim the account
              // runs at list price when it actually multiplies by 0.1.
              group_ratio: {
                即梦渠道10: 1,
                "gpt-image-2-主": 0.0207,
                "gpt-官转": 3.9,
              },
            }),
            { status: 200 },
          ),
      ),
    )

    const basis = await fetchSiteBillingBasis(
      "https://aicost.example.com",
      "gpt-5.6-sol",
      "default",
    )
    expect(basis?.groupRatio).toBe(1)
    expect(basis?.groupRatioSource).toBe("unknown")
    expect(basis?.groupRatioKey).toBeUndefined()
    expect(basis?.groupRatioOptions).toHaveLength(3)
  })

  it("uses the only priced enable_group as an auto-group multiplier", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: [
                {
                  model_name: "gpt-5.6-sol",
                  quota_type: 0,
                  model_ratio: 37.5,
                  enable_groups: ["gpt-plus号池", "unpublished渠道"],
                },
              ],
              group_ratio: { "gpt-plus号池": 0.1, 即梦渠道10: 1 },
            }),
            { status: 200 },
          ),
      ),
    )

    const basis = await fetchSiteBillingBasis(
      "https://aicost.example.com",
      "gpt-5.6-sol",
      "default",
    )
    expect(basis?.groupRatioSource).toBe("auto_group")
    expect(basis?.groupRatio).toBe(0.1)
    expect(basis?.groupRatioKey).toBe("gpt-plus号池")
    expect(basis?.groupRatioCandidates).toEqual([
      { key: "gpt-plus号池", value: 0.1 },
    ])
  })

  it("keeps several priced enable_groups as candidates for the caller", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: [
                {
                  model_name: "gpt-5.6-sol",
                  quota_type: 0,
                  model_ratio: 37.5,
                  enable_groups: ["gpt-pro号池", "gpt-plus号池"],
                },
              ],
              group_ratio: { "gpt-pro号池": 0.25, "gpt-plus号池": 0.1 },
            }),
            { status: 200 },
          ),
      ),
    )

    const basis = await fetchSiteBillingBasis(
      "https://aicost.example.com",
      "gpt-5.6-sol",
      "default",
    )
    expect(basis?.groupRatioSource).toBe("unknown")
    expect(basis?.groupRatioCandidates).toHaveLength(2)
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

describe("matchGroupRatioCandidate", () => {
  const candidates = [
    { key: "gpt-pro号池", value: 0.25 },
    { key: "gpt-plus号池", value: 0.1 },
  ]

  it("picks the candidate that reproduces the observed multiplier", () => {
    expect(matchGroupRatioCandidate(candidates, 0.1)?.key).toBe("gpt-plus号池")
    expect(matchGroupRatioCandidate(candidates, 0.25)?.key).toBe("gpt-pro号池")
  })

  it("returns null rather than forcing a distant candidate", () => {
    expect(matchGroupRatioCandidate(candidates, 1.5)).toBeNull()
    expect(matchGroupRatioCandidate(candidates, 0)).toBeNull()
    expect(matchGroupRatioCandidate([], 0.1)).toBeNull()
    expect(matchGroupRatioCandidate(candidates, null)).toBeNull()
  })
})

describe("fetchBillingLogRatio", () => {
  const auth = { accessToken: "sk-test", remoteUserId: "7" }

  it("reads group_ratio from a JSON-string other payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: {
                items: [
                  {
                    model_name: "gpt-4o",
                    created_at: 1_793_088_000,
                    other: '{"model_ratio":1,"group_ratio":0.3}',
                  },
                ],
              },
            }),
            { status: 200 },
          ),
      ),
    )

    const log = await fetchBillingLogRatio("https://relay.test", "gpt-4o", auth)
    expect(log?.groupRatio).toBe(0.3)
  })

  it("skips rows for other models and rows older than the probe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: [
                {
                  model_name: "gpt-4o-mini",
                  created_at: 1_793_088_100,
                  other: { group_ratio: 2 },
                },
                {
                  model_name: "gpt-4o",
                  created_at: 1_793_000_000,
                  other: { group_ratio: 5 },
                },
                {
                  model_name: "gpt-4o",
                  created_at: 1_793_088_200,
                  other: { group_ratio: 0.1 },
                },
              ],
            }),
            { status: 200 },
          ),
      ),
    )

    const log = await fetchBillingLogRatio(
      "https://relay.test",
      "gpt-4o",
      auth,
      1_793_088_000,
    )
    expect(log?.groupRatio).toBe(0.1)
  })

  it("returns null when the log endpoint is unavailable or unparsable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 404 })),
    )
    expect(
      await fetchBillingLogRatio("https://relay.test", "gpt-4o", auth),
    ).toBeNull()
    expect(
      await fetchBillingLogRatio("https://relay.test", "gpt-4o", undefined),
    ).toBeNull()
  })
})

describe("billingProbe", () => {
  it("compares the actual deduction against the site's model and group price", async () => {
    // New API official: points = (1000 + 1000*1.2) * 0.5 * 0.8 = 880
    const quotaValues = [1_000_000, 999_120]
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
      deductedUsd: 0.00176,
      expectedUsd: 0.00176,
      basis: "site",
      comparison: "ok",
      groupRatioSource: "user",
      impliedGroupRatio: 0.8,
    })
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })

  it("bills an auto-group request at the channel that served it", async () => {
    // aicost: the account group "default" is absent from group_ratio; the row
    // allows two channels and the deduction identifies gpt-plus号池 (0.1).
    const quotaValues = [1_000_000, 999_836]
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
              usage: {
                prompt_tokens: 4397,
                completion_tokens: 10,
                prompt_tokens_details: { cached_tokens: 4224 },
              },
            }),
            { status: 200 },
          )
        }
        if (url.endsWith("/api/pricing")) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  model_name: "gpt-5.6-sol",
                  quota_type: 0,
                  model_ratio: 37.5,
                  completion_ratio: 8,
                  billing_mode: "tiered_expr",
                  billing_expr:
                    '(len < 272000 ? tier("base", p * 5 + c * 30 + cr * 0.5 + cc * 6.25) : tier("long_context", p * 10 + c * 45 + cr * 1 + cc * 12.5)) * (param("service_tier") == "priority" ? 2.5 : 1)',
                  enable_groups: ["gpt-pro号池", "gpt-plus号池"],
                },
              ],
              group_ratio: {
                "gpt-pro号池": 0.25,
                "gpt-plus号池": 0.1,
                即梦渠道10: 1,
              },
            }),
            { status: 200 },
          )
        }
        if (url.endsWith("/api/status")) {
          return new Response(JSON.stringify({ quota_per_unit: 500000 }), {
            status: 200,
          })
        }
        return new Response("not found", { status: 404 })
      }),
    )

    const result = await billingProbe.run({
      ...credentials,
      model: "gpt-5.6-sol",
    })

    expect(result.verdict).toBe("pass")
    expect(result.summaryKey).toBe("summaries.billingOk")
    expect(result.evidence).toMatchObject({
      // (173×5 + 4224×0.5 + 10×30) / 1M × 0.1 = 0.000328
      deductedUsd: 0.000328,
      expectedUsd: 0.000328,
      basis: "site",
      comparison: "ok",
      groupRatioSource: "auto_group",
      groupRatioKey: "gpt-plus号池",
      resolvedGroupRatio: 0.1,
      impliedGroupRatio: 0.1,
      userGroup: "default",
    })
  })

  it("prefers the multiplier recorded in the site's consumption log", async () => {
    // The account group "vip" is absent from group_ratio, so nothing in
    // /api/pricing resolves it. The log says the site applied 0.5 — that is
    // ground truth and must win over any inference.
    const quotaValues = [1_000_000, 998_900]
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith("/api/user/self")) {
          return new Response(
            JSON.stringify({
              data: { quota: quotaValues.shift(), group: "vip" },
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
        if (url.endsWith("/api/pricing")) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  model_name: "gpt-4o",
                  model_ratio: 1,
                  completion_ratio: 1.2,
                },
              ],
              group_ratio: { "some-channel": 3 },
            }),
            { status: 200 },
          )
        }
        if (url.includes("/api/log/self")) {
          return new Response(
            JSON.stringify({
              data: {
                items: [
                  {
                    model_name: "gpt-4o",
                    created_at: Math.floor(Date.now() / 1000),
                    other: '{"model_ratio":1,"group_ratio":0.5}',
                  },
                ],
              },
            }),
            { status: 200 },
          )
        }
        if (url.endsWith("/api/status")) {
          return new Response(JSON.stringify({ quota_per_unit: 500000 }), {
            status: 200,
          })
        }
        return new Response("not found", { status: 404 })
      }),
    )

    const result = await billingProbe.run(credentials)

    expect(result.summaryKey).toBe("summaries.billingOk")
    expect(result.evidence).toMatchObject({
      // list price (1000×$2 + 1000×$2.4)/1M = 0.0044, log multiplier 0.5
      deductedUsd: 0.0022,
      expectedUsd: 0.0022,
      basis: "site",
      comparison: "ok",
      groupRatioSource: "log",
      resolvedGroupRatio: 0.5,
      logGroupRatio: 0.5,
      impliedGroupRatio: 0.5,
      userGroup: "vip",
    })
  })

  it("falls back to the baseline and labels that comparison when list price is unavailable", async () => {
    // New API official: baseline points = (1000 + 1000*1.3) * 1 = 2300
    const quotaValues = [1_000_000, 997_700]
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
      expectedUsd: 0.0046,
    })
  })
})
