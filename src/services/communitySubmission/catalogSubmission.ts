/**
 * Model-catalog contribution bridge.
 *
 * This module deliberately accepts only the normalized public catalog shape.
 * It never receives runtime keys, access tokens, balances, or user identity.
 */

import {
  communitySubmissionService,
  finalizePricePayload,
  sanitizeModelCatalog,
} from "~/services/communitySubmission"
import type { ModelCatalogSnapshot } from "~/services/modelCatalog/snapshot"
import { userPreferences } from "~/services/preferences/userPreferences"
import { getExtensionVersion } from "~/utils/browser/runtime"

/**
 * Submits a public, normalized model-price catalog when the user opted in.
 * Any failure is intentionally swallowed so it cannot break catalog loading.
 */
export async function submitCatalogSnapshot(params: {
  origin: string
  siteType: string
  pricing: ModelCatalogSnapshot
}): Promise<void> {
  try {
    const preferences = await userPreferences.getPreferences()
    const settings = preferences.communitySubmission
    if (
      !settings?.enabled ||
      !settings.endpoint?.trim() ||
      !settings.autoSubmitAfterCatalog
    ) {
      return
    }

    const entries = params.pricing.data.map((model) => ({
      model_name: model.model_name,
      quota_type: model.quota_type,
      model_ratio: finiteNumber(model.model_ratio),
      model_price: normalizeModelPrice(model.model_price),
      completion_ratio: finiteNumber(model.completion_ratio),
      token_price_usd_per_million: model.token_price_usd_per_million
        ? {
            input: finiteNumber(model.token_price_usd_per_million.input),
            output: finiteNumber(model.token_price_usd_per_million.output),
            cache_read: finiteNumber(
              model.token_price_usd_per_million.cache_read,
            ),
            cache_write: finiteNumber(
              model.token_price_usd_per_million.cache_write,
            ),
          }
        : undefined,
    }))

    const sanitized = sanitizeModelCatalog(params.origin, entries, {
      extensionVersion: getExtensionVersion("unknown"),
      siteType: params.siteType,
      hashStationUrl: settings.hashStationUrl,
    })
    const stationHash = await sanitized.stationHash
    const payload = await finalizePricePayload(sanitized.payload, stationHash)
    await communitySubmissionService.submitPrices(
      settings.endpoint.trim(),
      payload,
    )
  } catch {
    // Catalog refresh must never fail because an optional contribution failed.
  }
}

/** Return finite numeric values only, excluding NaN and infinities. */
function finiteNumber(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

/** Copy only numeric per-call or token prices into the allowlisted payload. */
function normalizeModelPrice(
  value: number | { input: number; output: number } | undefined,
): number | { input?: number; output?: number } | undefined {
  if (typeof value === "number") return finiteNumber(value)
  if (!value) return undefined
  return {
    input: finiteNumber(value.input),
    output: finiteNumber(value.output),
  }
}
