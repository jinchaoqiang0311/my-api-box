/**
 * Community contribution: anonymous, opt‑in submission of probe results and
 * model price snapshots to a user‑configured relay‑station‑rating backend.
 *
 * Privacy红线: API key, accessToken,余额绝对值, 个人数据绝不离开本地.
 * 只白名单选取: baseUrl (可哈希化), 探针 verdict + 量化指标, 模型公开价格.
 */

import type { ProbeVerdict } from "~/services/probeSystem/types"

export interface CommunitySubmissionSettings {
  /** Master switch. Default OFF. */
  enabled: boolean
  /**
   * Backend API endpoint. User‑configured, default empty string.
   * Example: "https://ratings.example.com/api/v1"
   */
  endpoint: string
  /** When true, station URLs are SHA‑256 hashed before upload. */
  hashStationUrl: boolean
  /** Auto‑submit after every Site Probing run. */
  autoSubmitAfterProbe: boolean
  /** Auto‑submit model price snapshots after catalog refresh. */
  autoSubmitAfterCatalog: boolean
}

export const DEFAULT_COMMUNITY_SUBMISSION_SETTINGS: CommunitySubmissionSettings =
  {
    enabled: false,
    endpoint: "",
    hashStationUrl: false,
    autoSubmitAfterProbe: true,
    autoSubmitAfterCatalog: true,
  }

/* -------------------------------------------------------------------------- */
/*  Probe submission schema (what actually goes over the wire)                 */
/* -------------------------------------------------------------------------- */

export interface CommunityProbeSubmissionPayload {
  station_url: string
  station_hash?: string
  site_type: string
  extension_version: string
  submitted_at: number
  source: "site-probing"
  probes: CommunityProbeMeasures
}

export interface CommunityProbeMeasures {
  reach: {
    verdict: ProbeVerdict
    latency_ms?: number
    error?: string
  }
  identity: {
    verdict: ProbeVerdict
    claimed_model?: string
    actual_model?: string
  }
  injection: {
    verdict: ProbeVerdict
    risk_score?: number
    detected?: boolean
  }
  cache: {
    verdict: ProbeVerdict
    replay_detected?: boolean
  }
  stream: {
    verdict: ProbeVerdict
    first_token_ms?: number
    chunk_count?: number
  }
  billing: {
    verdict: ProbeVerdict
    overcharge_ratio?: number
  }
  consistency: {
    verdict: ProbeVerdict
    drift_severity?: number
  }
}

export interface CommunityPriceSubmissionPayload {
  station_url: string
  station_hash?: string
  site_type: string
  extension_version: string
  submitted_at: number
  source: "model-catalog"
  models: CommunityPriceModelEntry[]
}

export interface CommunityPriceModelEntry {
  model_name: string
  quota_type: number
  completion_ratio?: number
  token_price_usd_per_million?: {
    input?: number
    output?: number
    cache_read?: number
    cache_write?: number
  }
}
