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
 * Site‑published pricing row fields the reconciliation relies on.
 * New API v5+ adds billing_mode / billing_expr to rows; custom‑expression
 * modes (tiered_expr, token_expr) bypass the standard model_ratio × tokens
 * formula, so we parse them explicitly with parseTieredExpr below.
 */
export interface SitePricingRow {
  quota_type?: unknown
  model_ratio?: unknown
  model_price?: unknown
  completion_ratio?: unknown
  /**
   * Cache‑read / fresh‑input multiplier (cache_ratio > 0 means caching is
   *  separately billed). New API default is cache_ratio = completion_ratio.
   */
  cache_ratio?: unknown
  /** Optional custom billing mode — when non-default, standard ratio math is not used. */
  billing_mode?: unknown
  /** Raw custom billing expression — only meaningful when billing_mode is non-default. */
  billing_expr?: unknown
}

/**
 * Parsed tiered_expr body — coefficient units are USD / 1M tokens. First tier
 * in the expression is always the base (short‑context) tier, which is what a
 * single‑probe request hits (< 4500 tokens). Missing optional coefficients
 * return null; the caller must handle that.
 */
export interface TieredExprParsed {
  /** Fresh input price, USD / 1M tokens (coefficient of `p`). */
  input: number
  /** Output price, USD / 1M tokens (coefficient of `c`). */
  output: number
  /** Cache‑read price, USD / 1M tokens (coefficient of `cr`), or null if absent. */
  cacheRead: number | null
  /** Cache‑write price, USD / 1M tokens (coefficient of `cc`), or null if absent. */
  cacheWrite: number | null
}

/**
 * Parse a New API v5+ `billing_expr` into USD/M prices. RelayLens validated
 * this regex approach against real aicost billing data (40 lines, "分毫对平").
 *
 * Handles three shapes — all we see in the wild:
 *   1. Single tier:                tier("name", p*X + c*Y + cr*Z + …)
 *   2. len‑conditional two‑tier:   len <= N ? tier("base", …) : tier("hi", …)
 *   3. Parameter‑wrapped:          (expr) * (param("service_tier")=="priority" ? 2 : 1)
 *
 * Only the FIRST tier is extracted — probe requests always land there.
 * Returns null when the expression is missing, has no `p` coefficient, or is
 * otherwise unparseable.
 */
export function parseTieredExpr(expr: unknown): TieredExprParsed | null {
  if (typeof expr !== "string") return null
  // Strip parameter wrappers like (expr) * (param("service_tier")=="priority" ? 2 : 1)
  // — we just want the first tier body, whose coefficients are absolute USD/M.
  const first = /tier\(\s*["'][^"']*["']\s*,([^)]*)\)/s.exec(expr)
  let body: string | null = null
  if (first) body = first[1]
  else if (!/tier\(/.test(expr)) body = expr // no tier() wrapper — whole expr is body
  if (!body) return null
  const coef = (name: string): number | null => {
    const m = new RegExp("\\b" + name + "\\s*\\*\\s*([\\d.]+)").exec(
      body as string,
    )
    return m ? Number(m[1]) : null
  }
  const p = coef("p")
  const c = coef("c")
  if (
    p == null ||
    c == null ||
    !Number.isFinite(p) ||
    !Number.isFinite(c) ||
    p <= 0 ||
    c <= 0
  )
    return null
  const cr = coef("cr")
  const cc = coef("cc")
  return {
    input: p,
    output: c,
    cacheRead: cr != null && Number.isFinite(cr) ? cr : null,
    cacheWrite: cc != null && Number.isFinite(cc) ? cc : null,
  }
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
 * Returns null only when we cannot derive any USD/M price from the row.
 *
 * Three pricing sources — handled by one unified formula:
 *   1. Per‑call (quota_type === 1): model_price is in USD → groupRatio is enough.
 *   2. tiered_expr / token_expr:    parseTieredExpr extracts $/M coefficients.
 *   3. default billing_mode:        model_ratio / quotaPerUnit → $/M input,
 *                                   × completion_ratio → output,
 *                                   × cache_ratio (or completion_ratio as fallback) → cacheRead.
 *
 * Unified expectedUsd (in USD):
 *   fresh = max(0, promptTokens − cachedTokens)
 *   expectedUsd = (fresh × input + cached × cacheRead + completion × output) / 1_000_000 × groupRatio
 *
 * New API quirk: cache_ratio defaults to completion_ratio when omitted.
 * Base anchor: 1 group = model_ratio = 1 → $1 / 1M tokens = 500_000 points
 * (quotaPerUnit = 500_000 is the New API default exchange).
 */
export function computeSiteExpectedUsd(input: {
  promptTokens: number
  completionTokens: number
  cachedTokens?: number | null
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
  const cachedTokens =
    typeof input.cachedTokens === "number" &&
    Number.isFinite(input.cachedTokens) &&
    input.cachedTokens >= 0
      ? Math.min(input.cachedTokens, promptTokens)
      : 0

  // ── Per‑call billing (quota_type === 1) ─────────────────────
  const quotaType = coerceFiniteNumber(input.row.quota_type)
  if (quotaType === 1) {
    const modelPrice = finitePricingMultiplier(input.row.model_price)
    if (modelPrice == null) return null
    // model_price is already USD per request, groupRatio multiplies it.
    // quota_per_unit cancels out.
    return round6(modelPrice * groupRatio)
  }

  // ── Derive $/M input / output / cacheRead from row ──────────
  let inputUSDperM: number | null = null
  let outputUSDperM: number | null = null
  let cacheReadUSDperM: number | null = null

  const tiered = parseTieredExpr(input.row.billing_expr)
  if (tiered) {
    // tiered_expr coefficients ARE USD/M prices (RelayLens 40-bill verified).
    inputUSDperM = tiered.input
    outputUSDperM = tiered.output
    cacheReadUSDperM = tiered.cacheRead
    if (inputUSDperM <= 0 || outputUSDperM <= 0) return null
  } else {
    const modelRatio = finiteNonnegative(input.row.model_ratio)
    if (modelRatio == null) return null
    // Default New API anchor (RelayLens verified, matches our prior formula):
    //   model_ratio × 2 / 1_000_000 USD/M  ≡  model_ratio / quotaPerUnit
    // since 2/1M = 1/500k and quotaPerUnit = 500_000 by default. Derive from
    // quotaPerUnit so forks that change their exchange rate still price right.
    const anchorPerM = 1_000_000 / quotaPerUnit
    inputUSDperM = modelRatio * anchorPerM
    const completionRatio =
      finitePricingMultiplier(input.row.completion_ratio) ??
      BASELINE_COMPLETION_RATIO
    outputUSDperM = inputUSDperM * completionRatio
    const cacheRatio = finitePricingMultiplier(input.row.cache_ratio)
    if (cacheRatio != null && cacheRatio > 0) {
      cacheReadUSDperM = inputUSDperM * cacheRatio
    }
    // New API default when cache_ratio omitted: cacheRead falls back to
    // input price (conservative — never underestimates billing).
  }

  // ── Apply unified three‑part formula ────────────────────────
  // Fresh prompt tokens billed at input price; cached tokens billed at
  // cacheRead price (falls back to input when cache price unknown).
  const freshTokens = Math.max(0, promptTokens - cachedTokens)
  const effectiveCachePrice = cacheReadUSDperM ?? inputUSDperM

  // USD = tokens × ($/M) / 1_000_000, then × groupRatio for the user's tier.
  const freshUsd = (freshTokens * (inputUSDperM as number)) / 1_000_000
  const cacheUsd = (cachedTokens * effectiveCachePrice) / 1_000_000
  const outUsd = (completionTokens * (outputUSDperM as number)) / 1_000_000

  return round6((freshUsd + cacheUsd + outUsd) * groupRatio)
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
 * True when we can derive a USD/M price from a row. Three sources:
 *   - Per‑call (quota_type === 1) → model_price × groupRatio
 *   - tiered_expr / token_expr     → parseTieredExpr extracts $/M coefficients
 *   - default                      → model_ratio × groupRatio / quotaPerUnit
 * Any mode that isn't tiered_expr / token_expr / default and doesn't have a
 * parsable model_ratio / model_price is unusable (rare).
 */
function isUsablePricingRow(row: SitePricingRow): boolean {
  const quotaType = coerceFiniteNumber(row.quota_type)
  if (quotaType === 1) return finitePricingMultiplier(row.model_price) != null
  // Custom billing modes are now usable — we parse the expression body.
  if (isCustomBillingMode(row)) return parseTieredExpr(row.billing_expr) != null
  // Default mode: need model_ratio (0 is legitimate for free tiers).
  return finiteNonnegative(row.model_ratio) != null
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

    // Resolve the user's effective group multiplier.
    // RelayLens-proven priority:
    //   1. The user's named group (read from /api/user/self)
    //   2. A group literally named "default" / "默认" / "普通用户" / "normal"
    //   3. The median multiplier across all published groups (not the cheapest
    //      — special "VIP" groups are shown as "特价组", not the main price)
    //   4. Final fallback = 1
    const ratios = readStringRecord(payload.group_ratio) ?? {}
    const ratioEntries = Object.entries(ratios)
      .map(([k, v]) => ({ key: k, value: coerceFiniteNumber(v) }))
      .filter(
        (e): e is { key: string; value: number } =>
          e.value != null && Number.isFinite(e.value) && e.value >= 0,
      )
    let groupRatio: number | null = null
    if (ratioEntries.length > 0) {
      const DEFAULT_RE = /^(default|默认|普通用户|normal)$/i
      // 1. user's group
      if (userGroup && ratioEntries.find((e) => e.key === userGroup)) {
        groupRatio = ratioEntries.find((e) => e.key === userGroup)!.value
      } else {
        // 2. default group by name
        const def = ratioEntries.find((e) => DEFAULT_RE.test(e.key))
        if (def) groupRatio = def.value
      }
      // 3. median of all group ratios (no default group → pick the middle value)
      if (groupRatio == null) {
        const sorted = [...ratioEntries].sort((a, b) => a.value - b.value)
        groupRatio = sorted[Math.floor(sorted.length / 2)].value
      }
    }

    // If the row's billing_mode is custom AND we can't parse its expression
    // (rare — e.g. token_expr with no p*c pattern), surface the skipped row
    // for diagnostics but return no usable row. Otherwise tiered_expr rows
    // are now fully usable via parseTieredExpr above.
    if (!isUsablePricingRow(row)) {
      return {
        row: null as unknown as SitePricingRow,
        groupRatio: groupRatio ?? 1,
        skippedRow: row,
        isCustomBillingMode: isCustomBillingMode(row),
      }
    }

    return { row, groupRatio: groupRatio ?? 1 }
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
