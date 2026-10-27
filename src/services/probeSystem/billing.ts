/**
 * Billing-probe price facts: reconcile the measured deduction against the
 * site's OWN list price instead of a fixed ecosystem baseline.
 *
 * Price facts come from the public /api/pricing surface of New API panels
 * (model_ratio / completion_ratio / quota_type / model_price) plus the
 * user's group from /api/user/self and its multiplier from group_ratio.
 * Anything missing or malformed degrades to `null`; the probe then falls
 * back to the ecosystem baseline and labels the comparison accordingly.
 */

const USD_PER_1M_AT_RATIO_1 = 2

/**
 * Completion multiplier assumed when the site does not publish one. Matches
 * the historical baseline assumption so the fallback stays consistent.
 */
export const BASELINE_COMPLETION_RATIO = 1.3

/** USD tolerance used when rounding makes a tiny expected charge zero. */
const BILLING_ABSOLUTE_TOLERANCE_USD = 0.001

/** Relative tolerance allowed for normal billing drift. */
const BILLING_RELATIVE_TOLERANCE = 0.3

/** Below this fraction of the site quote is reported as under-list billing. */
const BILLING_UNDERCHARGE_RATIO = 0.7

/** The site-published pricing row fields the reconciliation relies on. */
export interface SitePricingRow {
  quota_type?: unknown
  model_ratio?: unknown
  model_price?: unknown
  completion_ratio?: unknown
}

/** Resolved site basis: one pricing row plus the user's group multiplier. */
export interface SiteBillingBasis {
  row: SitePricingRow
  groupRatio: unknown
}

/** Accepts any finite non-negative number (free tiers price at 0). */
function finiteNonnegative(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null
}

/** Accepts only finite positive numbers (missing/degenerate values excluded). */
function finitePositive(value: unknown): number | null {
  const normalized = finiteNonnegative(value)
  return normalized != null && normalized > 0 ? normalized : null
}

/** Accepts pricing multipliers where 0 is a legitimate "free" multiplier. */
function finitePricingMultiplier(value: unknown): number | null {
  return finiteNonnegative(value)
}

/** Rounds to the six decimal places New API quota accounting uses. */
function round6(value: number): number {
  return Number(value.toFixed(6))
}

/**
 * Pure expected-cost calculation for one site pricing row and group ratio.
 * Returns null when the row lacks the facts needed for a site-based
 * expectation (the caller then uses the ecosystem baseline).
 */
export function computeSiteExpectedUsd(input: {
  promptTokens: number
  completionTokens: number
  row: SitePricingRow
  groupRatio?: unknown
}): number | null {
  const groupRatio = finitePricingMultiplier(input.groupRatio) ?? 1
  const promptTokens =
    typeof input.promptTokens === "number" &&
    Number.isFinite(input.promptTokens) &&
    input.promptTokens >= 0
      ? input.promptTokens
      : 0
  const completionTokens =
    typeof input.completionTokens === "number" &&
    Number.isFinite(input.completionTokens) &&
    input.completionTokens >= 0
      ? input.completionTokens
      : 0

  // Per-call billing: the site charges a fixed price per request.
  const modelPrice =
    input.row.quota_type === 1
      ? finitePricingMultiplier(input.row.model_price)
      : null
  if (modelPrice != null) {
    return round6(modelPrice * groupRatio)
  }

  const modelRatio = finiteNonnegative(input.row.model_ratio)
  if (modelRatio == null) return null
  const completionRatio =
    finitePricingMultiplier(input.row.completion_ratio) ??
    BASELINE_COMPLETION_RATIO
  return round6(
    ((promptTokens + completionTokens * completionRatio) *
      modelRatio *
      groupRatio *
      USD_PER_1M_AT_RATIO_1) /
      1_000_000,
  )
}

/** Verdict buckets the reconciliation maps measured spend into. */
export type BillingComparison = "ok" | "under" | "over"

/**
 * Compare observed spend with the expected amount using both relative and
 * absolute tolerances. If the expected price is zero, any observed charge
 * above the absolute tolerance is an overcharge.
 */
export function compareBillingAmounts(
  deductedUsd: number,
  expectedUsd: number,
): BillingComparison {
  if (
    !Number.isFinite(deductedUsd) ||
    !Number.isFinite(expectedUsd) ||
    deductedUsd < 0 ||
    expectedUsd < 0
  ) {
    return "ok"
  }
  if (expectedUsd <= BILLING_ABSOLUTE_TOLERANCE_USD) {
    return deductedUsd > BILLING_ABSOLUTE_TOLERANCE_USD ? "over" : "ok"
  }
  const ratio = deductedUsd / expectedUsd
  if (ratio > 1 + BILLING_RELATIVE_TOLERANCE) return "over"
  if (ratio < BILLING_UNDERCHARGE_RATIO) return "under"
  return "ok"
}

/** Narrowly reads an object of string keys, rejecting arrays and null. */
function readStringRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

/** True when the row carries enough facts for a site-based expectation. */
function isUsablePricingRow(row: SitePricingRow): boolean {
  if (row.quota_type === 1)
    return finitePricingMultiplier(row.model_price) != null
  return finitePositive(row.model_ratio) != null
}

/**
 * Fetch the site's list-price basis for one model. Resolves the user's group
 * multiplier from group_ratio (falling back to the default entry, then 1).
 * Returns null on any network, shape, or lookup failure — never throws.
 */
export async function fetchSiteBillingBasis(
  baseUrl: string,
  model: string,
  userGroup: string | undefined,
  auth?: { accessToken?: string; remoteUserId?: string },
): Promise<SiteBillingBasis | null> {
  try {
    const headers: Record<string, string> = {}
    if (auth?.accessToken) headers.Authorization = auth.accessToken
    if (auth?.remoteUserId) headers["New-Api-User"] = auth.remoteUserId
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/pricing`, {
      headers,
    })
    if (!response.ok) return null
    const payload = (await response.json()) as {
      data?: unknown
      group_ratio?: unknown
    }
    if (!Array.isArray(payload.data)) return null

    const row = payload.data.find(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        (entry as Record<string, unknown>).model_name === model,
    ) as SitePricingRow | undefined
    if (!row || !isUsablePricingRow(row)) return null

    const ratios = readStringRecord(payload.group_ratio) ?? {}
    const groupKey =
      userGroup && userGroup in ratios
        ? userGroup
        : "default" in ratios
          ? "default"
          : undefined
    const groupRatio = groupKey ? ratios[groupKey] : 1

    return { row, groupRatio }
  } catch {
    return null
  }
}
