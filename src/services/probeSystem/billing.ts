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

/**
 * The site-published pricing row fields the reconciliation relies on.
 * New API v5+ adds billing_mode / billing_expr to rows; custom-expression
 * modes (tiered_expr, token_expr) bypass the standard model_ratio × tokens
 * formula, so we cannot compute a site-based expected cost for them.
 */
export interface SitePricingRow {
  quota_type?: unknown
  model_ratio?: unknown
  model_price?: unknown
  completion_ratio?: unknown
  /** Optional custom billing mode — when non-default, standard ratio math is not used. */
  billing_mode?: unknown
  /** Raw custom billing expression — only meaningful when billing_mode is non-default. */
  billing_expr?: unknown
}

/** Resolved site basis: one pricing row plus the user's group multiplier. */
export interface SiteBillingBasis {
  row: SitePricingRow
  groupRatio: unknown
  /**
   * When the model row exists but uses a non-default billing_mode (e.g.
   * tiered_expr, token_expr), the row is preserved here so callers can
   * surface it for diagnosis even though it's not usable for formula
   * evaluation. `row` itself remains null in that case.
   */
  skippedRow?: SitePricingRow
  /** True when the matched model uses a custom (non-default) billing mode. */
  isCustomBillingMode?: boolean
}

/**
 * Per‑site configuration facts read from /api/status that affect how the
 * probe interprets quota and deduces the expected charge.
 */
export interface SiteStatusConfig {
  /** Points per USD used by this site's quota accounting. Default 500_000. */
  quotaPerUnit: number
  /**
   * Optional top‑up / recharge multiplier applied to the standard charge.
   * A site that gives you double points for the same money publishes 2 here,
   * which means every charge we compute must be divided by this factor to
   * reconcile against the user's points balance. Default 1 (no top‑up).
   */
  topUpRatio: number
  /**
   * Default group multiplier from the site‑wide fallback (when the user's
   *  named group is missing or /api/pricing does not publish one).
   */
  fallbackGroupRatio?: number
}

/**
 * Tolerantly coerces unknown values to finite numbers. New API forks often
 * serialize numeric pricing fields as strings ("0.5", "1"), so we accept both
 * native numbers and numeric strings — anything else (NaN, Infinity, non‑
 * numeric text, null) degrades to null.
 */
function coerceFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/** Accepts any finite non-negative number (free tiers price at 0). */
function finiteNonnegative(value: unknown): number | null {
  const num = coerceFiniteNumber(value)
  return num != null && num >= 0 ? num : null
}

/** Accepts only finite positive numbers (missing/degenerate values excluded). */
function finitePositive(value: unknown): number | null {
  const num = coerceFiniteNumber(value)
  return num != null && num > 0 ? num : null
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
 *
 * New API official formula:
 *   Token billing:  points = (tokens × completion_ratio) × model_ratio × group_ratio
 *                   expectedUsd = points / quota_per_unit
 *   Per-call billing: points = model_price(USD) × group_ratio × quota_per_unit
 *                   expectedUsd = points / quota_per_unit = model_price × group_ratio
 *
 * quota_per_unit defaults to 500_000 (1 USD = 500,000 points).
 */
export function computeSiteExpectedUsd(input: {
  promptTokens: number
  completionTokens: number
  row: SitePricingRow
  groupRatio?: unknown
  quotaPerUnit?: number
}): number | null {
  const groupRatio = finitePricingMultiplier(input.groupRatio) ?? 1
  const quotaPerUnit =
    typeof input.quotaPerUnit === "number" &&
    Number.isFinite(input.quotaPerUnit) &&
    input.quotaPerUnit > 0
      ? input.quotaPerUnit
      : 500_000
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

  // Bail out early if the row uses a custom billing mode — the published
  // model_ratio is just a placeholder and the real formula lives in a
  // billing_expr we cannot evaluate statically.
  if (
    typeof input.row.billing_mode === "string" &&
    input.row.billing_mode.trim().toLowerCase() !== "default"
  ) {
    return null
  }

  // Per-call billing: the site charges a fixed price per request.
  // model_price is in USD, so expectedUsd = model_price × group_ratio.
  // quota_per_unit cancels out (points = model_price × group_ratio × qpu;
  // expectedUsd = points / qpu = model_price × group_ratio).
  // quota_type may come as a string "1" from non-standard New API forks,
  // so we use coerceFiniteNumber for a tolerant comparison.
  const quotaType = coerceFiniteNumber(input.row.quota_type)
  const modelPrice =
    quotaType === 1 ? finitePricingMultiplier(input.row.model_price) : null
  if (modelPrice != null) {
    return round6(modelPrice * groupRatio)
  }

  // Token billing: standard New API formula.
  //   points = (prompt + completion × completion_ratio) × model_ratio × group_ratio
  //   expectedUsd = points / quota_per_unit
  const modelRatio = finiteNonnegative(input.row.model_ratio)
  if (modelRatio == null) return null
  const completionRatio =
    finitePricingMultiplier(input.row.completion_ratio) ??
    BASELINE_COMPLETION_RATIO
  return round6(
    ((promptTokens + completionTokens * completionRatio) *
      modelRatio *
      groupRatio) /
      quotaPerUnit,
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

/**
 * True when the row carries enough facts for a site-based expectation.
 * Rows using New API v5+ custom billing modes (tiered_expr, token_expr, …)
 * are excluded because their model_ratio / completion_ratio values are
 * only placeholders — actual billing uses a site-authored expression we
 * cannot statically evaluate.
 */
function isUsablePricingRow(row: SitePricingRow): boolean {
  // Reject custom billing modes — only the default formula is evaluable.
  if (typeof row.billing_mode === "string" && row.billing_mode.length > 0) {
    const mode = row.billing_mode.trim().toLowerCase()
    if (mode !== "default") return false
  }
  const quotaType = coerceFiniteNumber(row.quota_type)
  if (quotaType === 1) return finitePricingMultiplier(row.model_price) != null
  return finitePositive(row.model_ratio) != null
}

/**
 * Returns whether a row's billing_mode is non-default (custom). Custom modes
 * (tiered_expr, token_expr, …) publish placeholder model_ratio values — the
 * actual billing uses an admin-authored expression we cannot evaluate.
 */
function isCustomBillingMode(row: SitePricingRow): boolean {
  if (typeof row.billing_mode !== "string" || row.billing_mode.length === 0)
    return false
  return row.billing_mode.trim().toLowerCase() !== "default"
}

/**
 * Fetch the site's list-price basis for one model. Resolves the user's group
 * multiplier from group_ratio (falling back to the default entry, then 1).
 *
 * Three outcomes:
 *   - Model not found / network error        → return null
 *   - Model found, default billing_mode      → return { row, groupRatio }
 *   - Model found, custom billing_mode       → return { skippedRow, isCustomBillingMode: true }
 *                                             (no usable `row` because we can't evaluate
 *                                             the expression).
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
    if (!row) return null

    // Resolve group ratio even for custom-mode rows — evidence diagnostics
    // still want to show it.
    const ratios = readStringRecord(payload.group_ratio) ?? {}
    const groupKey =
      userGroup && userGroup in ratios
        ? userGroup
        : "default" in ratios
          ? "default"
          : undefined
    const groupRatio = groupKey ? ratios[groupKey] : 1

    // Custom billing mode — row found but unusable for formula evaluation.
    if (isCustomBillingMode(row)) {
      return {
        row: null as unknown as SitePricingRow,
        groupRatio,
        skippedRow: row,
        isCustomBillingMode: true,
      }
    }

    // Default mode but missing required fields (model_ratio / model_price).
    if (!isUsablePricingRow(row)) return null

    return { row, groupRatio }
  } catch {
    return null
  }
}

/**
 * Fetches site-level configuration facts from /api/status: the quota‑per‑USD
 * exchange (default 500_000), the optional recharge/top‑up ratio, and any
 * site‑wide default group ratio. Missing fields fall back to safe defaults
 * — this function never throws and always returns a usable SiteStatusConfig.
 */
export async function fetchSiteStatusConfig(
  baseUrl: string,
  auth?: { accessToken?: string; remoteUserId?: string },
): Promise<SiteStatusConfig> {
  const DEFAULTS: SiteStatusConfig = {
    quotaPerUnit: 500_000,
    topUpRatio: 1,
  }
  try {
    const headers: Record<string, string> = {}
    if (auth?.accessToken) headers.Authorization = auth.accessToken
    if (auth?.remoteUserId) headers["New-Api-User"] = auth.remoteUserId
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/status`, {
      headers,
    })
    if (!response.ok) return DEFAULTS
    const payload = (await response.json()) as Record<string, unknown>
    if (!payload || typeof payload !== "object") return DEFAULTS

    // quota_per_unit — points per 1 USD worth of quota. 500k is the New API
    // default; some forks publish 250_000, 1_000_000, or similar.
    const quotaPerUnit =
      typeof payload.quota_per_unit === "number" &&
      Number.isFinite(payload.quota_per_unit) &&
      payload.quota_per_unit > 0
        ? payload.quota_per_unit
        : DEFAULTS.quotaPerUnit

    // top_up_ratio — bonus‑points multiplier from recharge campaigns (2 = you
    // get double points for the same money). Divide the theoretical charge
    // by this factor to reconcile against the user's points delta.
    const topUpRatio =
      typeof payload.top_up_ratio === "number" &&
      Number.isFinite(payload.top_up_ratio) &&
      payload.top_up_ratio > 0
        ? payload.top_up_ratio
        : DEFAULTS.topUpRatio

    // Site‑wide default group ratio — used as a backup when /api/pricing's
    // group_ratio map has no 'default' key.
    const grMap = payload.group_ratio as Record<string, unknown> | undefined
    const fallbackGroupRatio =
      grMap && typeof grMap === "object"
        ? grMap.default ?? grMap["*"] ?? undefined
        : undefined

    return {
      quotaPerUnit,
      topUpRatio,
      fallbackGroupRatio:
        typeof fallbackGroupRatio === "number" &&
        Number.isFinite(fallbackGroupRatio)
          ? fallbackGroupRatio
          : undefined,
    }
  } catch {
    return DEFAULTS
  }
}
