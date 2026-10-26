/**
 * submissionService: 纯 HTTP 提交层。
 *
 * 不负责脱敏（由 sanitizer.ts 完成），只负责把 payload POST 到用户配置的
 * backend endpoint。endpoint 默认空——如果空或非法则跳过，绝不静默失败。
 */

import { createLogger } from "~/utils/core/logger"

import type {
  CommunityPriceSubmissionPayload,
  CommunityProbeSubmissionPayload,
} from "./types"

const logger = createLogger("CommunitySubmission")

const TIMEOUT_MS = 10_000

export interface SubmissionResult {
  ok: boolean
  status?: number
  error?: string
}

/** Concatenates a base endpoint with a clean relative path. */
function buildUrl(endpoint: string, path: string): string {
  const trimmed = endpoint.replace(/\/+$/, "")
  const cleanPath = path.replace(/^\/+/, "")
  return `${trimmed}/${cleanPath}`
}

/** Accepts only non-empty https URLs; rejects http, file, data URIs. */
function isValidEndpoint(endpoint: string): boolean {
  if (!endpoint) return false
  try {
    const url = new URL(endpoint)
    return url.protocol === "https:"
  } catch {
    return false
  }
}

/** POSTs a JSON payload with a 10s timeout; returns structured SubmissionResult. */
async function postJson<T>(
  endpoint: string,
  path: string,
  payload: T,
): Promise<SubmissionResult> {
  if (!isValidEndpoint(endpoint)) {
    logger.debug("Skipping submission: endpoint not configured or invalid", {
      endpoint,
    })
    return { ok: false, error: "invalid-endpoint" }
  }

  const url = buildUrl(endpoint, path)

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (response.ok) {
      logger.info("Submission accepted", { path, status: response.status })
      return { ok: true, status: response.status }
    }

    logger.warn("Submission rejected", {
      path,
      status: response.status,
      bodyPreview: (await response.text()).slice(0, 200),
    })
    return { ok: false, status: response.status }
  } catch (error) {
    logger.warn("Submission failed", { path, error: String(error) })
    return { ok: false, error: String(error) }
  }
}

export const communitySubmissionService = {
  async submitProbe(
    endpoint: string,
    payload: CommunityProbeSubmissionPayload,
  ): Promise<SubmissionResult> {
    return postJson(endpoint, "probes", payload)
  },

  async submitPrices(
    endpoint: string,
    payload: CommunityPriceSubmissionPayload,
  ): Promise<SubmissionResult> {
    return postJson(endpoint, "prices", payload)
  },
}
