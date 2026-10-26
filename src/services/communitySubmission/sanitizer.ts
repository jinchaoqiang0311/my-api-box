/**
 * Sanitizer: 白名单脱敏层。
 *
 * 核心原则: 绝不直接序列化 ProbeReport / ProductCanonicalModel 等已有类型，
 * 而是逐字段白名单构造 submission 对象，防止 evidence 或嵌套对象意外夹带
 * apiKey / accessToken / 账户余额 / 个人偏好等敏感数据。
 */

import { PROBE_IDS, type ProbeReport } from "~/services/probeSystem/types"

import type {
  CommunityPriceModelEntry,
  CommunityPriceSubmissionPayload,
  CommunityProbeMeasures,
  CommunityProbeSubmissionPayload,
} from "./types"

/**
 * Optional SHA‑256 hash of a station origin, used when the user wants
 * anonymous upload without revealing the plain URL.
 */
async function hashStationUrl(origin: string): Promise<string> {
  const data = new TextEncoder().encode(origin)
  const buf = await crypto.subtle.digest("SHA-256", data)
  const bytes = Array.from(new Uint8Array(buf))
  return bytes
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16)
}

/** Read one numeric field from ProbeResult.evidence (read-only helper). */
function evidenceNum<T extends number | undefined>(
  evidence: Record<string, unknown> | undefined,
  key: string,
): T {
  if (!evidence) return undefined as T
  const v = evidence[key]
  return (typeof v === "number" ? v : undefined) as T
}

/** Read one boolean field from ProbeResult.evidence (read-only helper). */
function evidenceBool<T extends boolean | undefined>(
  evidence: Record<string, unknown> | undefined,
  key: string,
): T {
  if (!evidence) return undefined as T
  const v = evidence[key]
  return (typeof v === "boolean" ? v : undefined) as T
}

/** Read one string field from ProbeResult.evidence (read-only helper). */
function evidenceStr<T extends string | undefined>(
  evidence: Record<string, unknown> | undefined,
  key: string,
): T {
  if (!evidence) return undefined as T
  const v = evidence[key]
  return (typeof v === "string" ? v : undefined) as T
}

/** Find the ProbeResult for one probeId from a full ProbeReport. */
function findResult(report: ProbeReport, probeId: string) {
  return report.results.find((r) => r.probeId === probeId)
}

/* -------------------------------------------------------------------------- */

/** Whitelist‑sanitised ProbeReport → CommunityProbeSubmissionPayload. */
export async function sanitizeProbeReport(
  report: ProbeReport,
  opts: {
    extensionVersion: string
    siteType: string
    hashStationUrl: boolean
  },
): Promise<CommunityProbeSubmissionPayload> {
  const origin = report.origin.replace(/\/+$/, "")

  const probeMeasures: CommunityProbeMeasures = {
    reach: { verdict: "unknown" },
    identity: { verdict: "unknown" },
    injection: { verdict: "unknown" },
    cache: { verdict: "unknown" },
    stream: { verdict: "unknown" },
    billing: { verdict: "unknown" },
    consistency: { verdict: "unknown" },
  }

  const reach = findResult(report, PROBE_IDS.Reach)
  if (reach) {
    probeMeasures.reach = {
      verdict: reach.verdict,
      latency_ms: evidenceNum(reach.evidence, "latencyMs"),
      error: evidenceStr(reach.evidence, "error"),
    }
  }

  const identity = findResult(report, PROBE_IDS.Identity)
  if (identity) {
    probeMeasures.identity = {
      verdict: identity.verdict,
      claimed_model: evidenceStr(identity.evidence, "claimedModel"),
      actual_model: evidenceStr(identity.evidence, "actualModel"),
    }
  }

  const injection = findResult(report, PROBE_IDS.Injection)
  if (injection) {
    probeMeasures.injection = {
      verdict: injection.verdict,
      risk_score: evidenceNum(injection.evidence, "riskScore"),
      detected: evidenceBool(injection.evidence, "detected"),
    }
  }

  const cache = findResult(report, PROBE_IDS.Cache)
  if (cache) {
    probeMeasures.cache = {
      verdict: cache.verdict,
      replay_detected: evidenceBool(cache.evidence, "replayDetected"),
    }
  }

  const stream = findResult(report, PROBE_IDS.Stream)
  if (stream) {
    probeMeasures.stream = {
      verdict: stream.verdict,
      first_token_ms: evidenceNum(stream.evidence, "firstTokenMs"),
      chunk_count: evidenceNum(stream.evidence, "chunkCount"),
    }
  }

  const billing = findResult(report, PROBE_IDS.Billing)
  if (billing) {
    probeMeasures.billing = {
      verdict: billing.verdict,
      overcharge_ratio: evidenceNum(billing.evidence, "overchargeRatio"),
    }
  }

  const consistency = findResult(report, PROBE_IDS.Consistency)
  if (consistency) {
    probeMeasures.consistency = {
      verdict: consistency.verdict,
      drift_severity: evidenceNum(consistency.evidence, "driftSeverity"),
    }
  }

  const payload: CommunityProbeSubmissionPayload = {
    station_url: origin,
    site_type: opts.siteType,
    extension_version: opts.extensionVersion,
    submitted_at: Date.now(),
    source: "site-probing",
    probes: probeMeasures,
  }

  if (opts.hashStationUrl) {
    payload.station_hash = await hashStationUrl(origin)
  }

  return payload
}

/**
 * Sanitize a model catalog snapshot into a price submission.
 * Takes raw model entries (from ProductCanonicalModel or ModelCatalogModel).
 */
// @ts-expect-error — P1 helper, not consumed yet
function _sanitizeModelCatalog(
  origin: string,
  entries: Array<{
    model_name: string
    quota_type: number
    completion_ratio?: number
    token_price_usd_per_million?: {
      input?: number
      output?: number
      cache_read?: number
      cache_write?: number
    }
  }>,
  opts: {
    extensionVersion: string
    siteType: string
    hashStationUrl: boolean
  },
): {
  payload: CommunityPriceSubmissionPayload
  stationHash: string | undefined | Promise<string>
} {
  const sanitized: CommunityPriceModelEntry[] = entries.map((e) => ({
    model_name: e.model_name,
    quota_type: e.quota_type,
    completion_ratio:
      typeof e.completion_ratio === "number" ? e.completion_ratio : undefined,
    token_price_usd_per_million: e.token_price_usd_per_million
      ? {
          input: e.token_price_usd_per_million.input,
          output: e.token_price_usd_per_million.output,
          cache_read: e.token_price_usd_per_million.cache_read,
          cache_write: e.token_price_usd_per_million.cache_write,
        }
      : undefined,
  }))

  const hashPromise = opts.hashStationUrl ? hashStationUrl(origin) : undefined

  return {
    payload: {
      station_url: origin,
      site_type: opts.siteType,
      extension_version: opts.extensionVersion,
      submitted_at: Date.now(),
      source: "model-catalog",
      models: sanitized,
    },
    stationHash: hashPromise,
  }
}

/** Attaches the optional station_hash to a price payload before submission. */
// @ts-expect-error — P1 helper, not consumed yet
async function _finalizePricePayload(
  payload: CommunityPriceSubmissionPayload,
  stationHash: string | undefined,
): Promise<CommunityPriceSubmissionPayload> {
  if (stationHash) {
    payload.station_hash = stationHash
  }
  return payload
}
