/**
 * Site probing system: standardized integrity checks that verify a relay
 * site actually serves the model you pay for. Probes are token-cheap,
 * side-effect free, and return a machine verdict plus evidence; all human
 * text lives in the siteProbing i18n namespace, keyed by `summaryKey`.
 */

export const PROBE_IDS = {
  Reach: "reach",
  Identity: "identity",
  Injection: "injection",
  Cache: "cache",
  Stream: "stream",
  Billing: "billing",
  Consistency: "consistency",
} as const

export type ProbeId = (typeof PROBE_IDS)[keyof typeof PROBE_IDS]

export const ALL_PROBE_IDS: ProbeId[] = [
  PROBE_IDS.Reach,
  PROBE_IDS.Identity,
  PROBE_IDS.Injection,
  PROBE_IDS.Cache,
  PROBE_IDS.Stream,
  PROBE_IDS.Billing,
  PROBE_IDS.Consistency,
]

export type ProbeVerdict = "pass" | "fail" | "suspect" | "unknown" | "skip"

/** One probe outcome; `summaryKey` is translated by the siteProbing namespace. */
export interface ProbeResult {
  probeId: ProbeId
  verdict: ProbeVerdict
  summaryKey: string
  summaryParams?: Record<string, string | number>
  /** Machine-readable facts for local review and future anonymous upload. */
  evidence?: Record<string, unknown>
  at: number
}

/** Full suite report for one account+model run. */
export interface ProbeReport {
  accountId: string
  origin: string
  model: string
  at: number
  results: ProbeResult[]
}

/** Chat request shape shared by the engine helpers. */
export interface ProbeChatMessage {
  role: "user" | "system" | "assistant"
  content: string
}

export interface ProbeChatOutcome {
  ok: boolean
  content: string
  promptTokens: number | null
  completionTokens: number | null
  latencyMs: number
  error?: string
}

/** Credentials for one probe run. */
export interface ProbeCredentials {
  baseUrl: string
  /** sk- style key used for chat/stream/reach probes. */
  apiKey: string
  model: string
  /**
   * New API system access token + user id; required only by the billing
   * probe, which reads quota before/after one billed request.
   */
  accessToken?: string
  remoteUserId?: string
}
