/**
 * Consistency probe (the 7th): detects silent model swaps over time by
 * comparing each run against a stored baseline for the same origin+model.
 * A single run cannot prove a swap; drift is reported as suspect so the
 * operator can re-run or escalate.
 */

import { probeChatRequest } from "./probes"
import { PROBE_IDS, type ProbeCredentials, type ProbeResult } from "./types"

/** FNV-1a answer fingerprint; stable, dependency-free, sufficient for drift. */
function hashAnswer(text: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

/** Baseline facts captured per origin+model. */
export interface ProbeBaseline {
  claimed: string
  cutoff: string
  /** SHA-256 of the temp-0 identity answer for exact-answer drift. */
  answerHash: string
  ttftMs: number | null
  at: number
}

export interface ConsistencyOutcome {
  result: ProbeResult
  /** The new baseline to persist when the verdict is not an error. */
  baseline: ProbeBaseline | null
}

/** Builds the stable storage key (origin + model) for one baseline. */
function baselineKey(credentials: ProbeCredentials): string {
  return `${credentials.baseUrl.replace(/\/+$/, "")}|${credentials.model}`
}

/** Returns the public baseline storage key for the given credentials. */
export function computeBaselineKey(credentials: ProbeCredentials): string {
  return baselineKey(credentials)
}

/**
 * Compare a candidate baseline with the stored one. Exported for tests.
 */
export function compareBaselines(
  previous: ProbeBaseline,
  next: ProbeBaseline,
): { drifted: boolean; field?: string } {
  if (previous.claimed !== next.claimed)
    return { drifted: true, field: "claimed" }
  if (previous.cutoff !== next.cutoff) return { drifted: true, field: "cutoff" }
  if (previous.answerHash !== next.answerHash)
    return { drifted: true, field: "answerHash" }
  if (
    previous.ttftMs != null &&
    next.ttftMs != null &&
    next.ttftMs > previous.ttftMs * 3 + 2000
  ) {
    return { drifted: true, field: "ttftMs" }
  }
  return { drifted: false }
}

export const consistencyProbe = {
  id: PROBE_IDS.Consistency,
  costTokens: 60,
  async run(
    credentials: ProbeCredentials,
    loadBaseline: (key: string) => Promise<ProbeBaseline | null>,
  ): Promise<ConsistencyOutcome> {
    const outcome = await probeChatRequest(
      credentials,
      [
        {
          role: "user",
          content:
            "Reply in exactly this format and nothing else:\nMODEL=<the exact model name you are running as>\nCUTOFF=<your training data cutoff as year-month>",
        },
      ],
      { temperature: 0, maxTokens: 48 },
    )
    if (!outcome.ok) {
      return {
        result: {
          probeId: PROBE_IDS.Consistency,
          verdict: "unknown",
          summaryKey: "summaries.probeError",
          summaryParams: { error: outcome.error ?? "" },
          evidence: { error: outcome.error },
          at: Date.now(),
        },
        baseline: null,
      }
    }
    const modelMatch = /MODEL=\s*([^\n]+)/i.exec(outcome.content)
    const cutoffMatch = /CUTOFF=\s*([^\n]+)/i.exec(outcome.content)
    const claimed = (modelMatch?.[1] ?? "").trim()
    const cutoff = (cutoffMatch?.[1] ?? "").trim()
    const next: ProbeBaseline = {
      claimed,
      cutoff,
      answerHash: hashAnswer(outcome.content.trim()),
      ttftMs: outcome.latencyMs,
      at: Date.now(),
    }
    const previous = await loadBaseline(baselineKey(credentials))
    if (!previous) {
      return {
        result: {
          probeId: PROBE_IDS.Consistency,
          verdict: "pass",
          summaryKey: "summaries.consistencyFirst",
          evidence: { claimed, cutoff },
          at: next.at,
        },
        baseline: next,
      }
    }
    const comparison = compareBaselines(previous, next)
    if (comparison.drifted) {
      return {
        result: {
          probeId: PROBE_IDS.Consistency,
          verdict: "suspect",
          summaryKey: "summaries.consistencyDrift",
          summaryParams: { field: comparison.field ?? "" },
          evidence: {
            previous: { claimed: previous.claimed, cutoff: previous.cutoff },
            next: { claimed, cutoff },
          },
          at: next.at,
        },
        baseline: next,
      }
    }
    return {
      result: {
        probeId: PROBE_IDS.Consistency,
        verdict: "pass",
        summaryKey: "summaries.consistencyStable",
        evidence: { claimed, cutoff },
        at: next.at,
      },
      baseline: next,
    }
  },
}
