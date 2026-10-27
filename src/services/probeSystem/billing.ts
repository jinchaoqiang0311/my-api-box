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
  /**
   * Channel groups that can serve this model. On sites with
   * `default_use_auto_group` the request is routed to one of these and billed
   * at THAT group's ratio — the only way to price an account whose own group
   * name isn't published in group_ratio.
   */
  enable_groups?: unknown
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
  if (first) body = first[1] ?? null
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
   * Which rule produced `groupRatio` — surfaced in probe evidence so users can
   * tell a real per-account multiplier from an assumption.
   *   log      → the site's own consumption log recorded the multiplier it
   *              applied to THIS request (ground truth, works on any New API
   *              site including auto-group routing)
   *   user     → the account's own group name matched a group_ratio key
   *   default  → a group literally named default/默认/普通用户/normal
   *   auto_group → the model's enable_groups narrowed it to one published group
   *   status   → /api/status published a site-wide default multiplier
   *   unknown  → nothing matched; ratio assumed 1 and must NOT be trusted
   */
  groupRatioSource?:
    | "log"
    | "user"
    | "default"
    | "auto_group"
    | "status"
    | "unknown"
  /** The group_ratio key the ratio came from, when one matched. */
  groupRatioKey?: string
  /**
   * Ratios of the groups that can actually serve this model (row.enable_groups
   * ∩ group_ratio). More than one means the site bills per-request routing
   * (default_use_auto_group), so the caller must pick the one that matches the
   * observed deduction.
   */
  groupRatioCandidates?: Array<{ key: string; value: number }>
  /**
   * Every published group_ratio entry, in API order. Surfaced in evidence so
   * a mismatched account group can be diagnosed without re-fetching /api/pricing.
   */
  groupRatioOptions?: Array<{ key: string; value: number }>
  /**
   * When the model row exists but we cannot derive a price from it, the row
   * is preserved here for diagnostics. `row` itself is null in that case.
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
 * Quota points of rounding slack allowed before a delta counts as a real charge.
 * New API quota is an integer, so a 1-quota rounding error is unavoidable;
 * 2 points (≈ $0.000004 at the 500k exchange) covers it without masking real
 * under/over-charges on sub-cent requests.
 */
const BILLING_ROUNDING_QUOTA_POINTS = 2

/**
 * Compare observed spend with the expected amount.
 *
 * The absolute floor exists ONLY to absorb New API's integer-quota rounding
 * (≈ 2 points). It must never be a fixed dollar amount: our probe requests
 * cost fractions of a cent, so a $0.001 floor would swallow every comparison
 * and report "ok" no matter how far off the site is.
 *
 * Zero-expected rows are the one case where only the floor applies — the
 * site published "free", so anything above rounding slack is an overcharge.
 */
export function compareBillingAmounts(
  deductedUsd: number,
  expectedUsd: number,
  quotaPerUnit?: number,
): BillingComparison {
  if (
    !Number.isFinite(deductedUsd) ||
    !Number.isFinite(expectedUsd) ||
    deductedUsd < 0 ||
    expectedUsd < 0
  ) {
    return "ok"
  }
  const qpu =
    typeof quotaPerUnit === "number" &&
    Number.isFinite(quotaPerUnit) &&
    quotaPerUnit > 0
      ? quotaPerUnit
      : 500_000
  const roundingFloorUsd = BILLING_ROUNDING_QUOTA_POINTS / qpu

  if (expectedUsd <= roundingFloorUsd) {
    return deductedUsd > roundingFloorUsd ? "over" : "ok"
  }
  // Ignore differences inside the integer-rounding band.
  if (Math.abs(deductedUsd - expectedUsd) <= roundingFloorUsd) return "ok"
  const ratio = deductedUsd / expectedUsd
  if (ratio > 1 + BILLING_RELATIVE_TOLERANCE) return "over"
  if (ratio < BILLING_UNDERCHARGE_RATIO) return "under"
  return "ok"
}

/** Narrowly reads an array of strings, dropping any non-string entries. */
function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : []
}

/** Relative slack allowed when matching an observed multiplier to a candidate. */
const GROUP_RATIO_MATCH_TOLERANCE = 0.1

/**
 * Picks the enable_groups candidate whose ratio reproduces the observed
 * deduction. Auto‑group sites bill every request at the ratio of the channel
 * that served it, so the measured multiplier is the only ground truth; a
 * candidate that misses by more than 10% is rejected rather than forced.
 */
export function matchGroupRatioCandidate(
  candidates: SiteBillingBasis["groupRatioCandidates"],
  impliedGroupRatio: number | null | undefined,
): { key: string; value: number } | null {
  if (!candidates || candidates.length === 0) return null
  if (
    typeof impliedGroupRatio !== "number" ||
    !Number.isFinite(impliedGroupRatio) ||
    impliedGroupRatio <= 0
  ) {
    return null
  }
  let best: { key: string; value: number } | null = null
  let bestDelta = Infinity
  for (const candidate of candidates) {
    if (!(candidate.value > 0)) continue
    const delta =
      Math.abs(candidate.value - impliedGroupRatio) / candidate.value
    if (delta < bestDelta) {
      best = candidate
      bestDelta = delta
    }
  }
  return best != null && bestDelta <= GROUP_RATIO_MATCH_TOLERANCE ? best : null
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
    let groupRatioSource: SiteBillingBasis["groupRatioSource"] = "unknown"
    let groupRatioKey: string | undefined
    if (ratioEntries.length > 0) {
      const DEFAULT_RE = /^(default|默认|普通用户|normal)$/i
      const byUser = userGroup
        ? ratioEntries.find((e) => e.key === userGroup)
        : undefined
      if (byUser) {
        // 1. the account's own group
        groupRatio = byUser.value
        groupRatioSource = "user"
        groupRatioKey = byUser.key
      } else {
        const def = ratioEntries.find((e) => DEFAULT_RE.test(e.key))
        if (def) {
          // 2. a group literally named default
          groupRatio = def.value
          groupRatioSource = "default"
          groupRatioKey = def.key
        }
        // 3. No median guess: many relays publish CHANNEL names here
        //    (即梦渠道10, seedance2.0批发, gpt-image-2-主…) rather than
        //    account tiers, so a median is meaningless and silently reported
        //    1.0 for a site whose real multiplier was 0.1. Leaving the ratio
        //    unresolved lets the caller fall back to /api/status and the
        //    implied-ratio back-solve expose the truth.
      }
    }

    // 3. Auto‑group sites (aicost: default_use_auto_group) bill the request at
    //    the ratio of whichever channel served it, and the model row lists
    //    exactly those channels in enable_groups. Intersect them with the
    //    published map: one candidate = the real multiplier; several = the
    //    caller has to match them against the observed deduction.
    const candidates = readStringArray(row.enable_groups)
      .map((group) => ratioEntries.find((entry) => entry.key === group))
      .filter((entry): entry is { key: string; value: number } => entry != null)
    if (groupRatioSource === "unknown" && candidates.length === 1) {
      const only = candidates[0]
      if (only) {
        groupRatio = only.value
        groupRatioSource = "auto_group"
        groupRatioKey = only.key
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
        groupRatioSource,
        groupRatioKey,
        groupRatioOptions: ratioEntries,
        ...(candidates.length > 0 ? { groupRatioCandidates: candidates } : {}),
        skippedRow: row,
        isCustomBillingMode: isCustomBillingMode(row),
      }
    }

    return {
      row,
      groupRatio: groupRatio ?? 1,
      groupRatioSource,
      groupRatioKey,
      groupRatioOptions: ratioEntries,
      ...(candidates.length > 0 ? { groupRatioCandidates: candidates } : {}),
    }
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

/** A consumption-log row, reduced to the billing fields we trust from it. */
export interface BillingLogRatio {
  /** The multiplier the site itself recorded for this request. */
  groupRatio: number
  modelName?: string
  /** Raw `other` payload — New API stores every billing parameter here. */
  other: Record<string, unknown>
}

/** Reads the newest log entries out of either `{data:{items:[]}}` or `{data:[]}`. */
function readLogRows(data: unknown): Array<Record<string, unknown>> {
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown } | null)?.items)
      ? ((data as { items: unknown[] }).items as unknown[])
      : []
  return list.filter(
    (entry): entry is Record<string, unknown> =>
      typeof entry === "object" && entry !== null,
  )
}

/** `other` is a JSON string on some forks and an object on others. */
function readLogOther(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value)
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null
}

/**
 * Ground truth for the group multiplier: New API records the ratio it actually
 * applied inside the consumption log's `other` field (`group_ratio`). Reading
 * it beats any inference from /api/pricing, because it covers every case the
 * public map does not: auto-group routing, unpublished discount groups, group
 * names that differ between the panel and the pricing endpoint.
 *
 * Returns the newest entry that matches `model` (and, when the log exposes
 * timestamps, was written after `sinceSeconds`) — earlier rows belong to other
 * requests whose ratio may legitimately differ.
 */
export async function fetchBillingLogRatio(
  baseUrl: string,
  model: string,
  auth: { accessToken?: string; remoteUserId?: string } | undefined,
  sinceSeconds?: number,
): Promise<BillingLogRatio | null> {
  if (!auth?.accessToken) return null
  try {
    const headers: Record<string, string> = {
      Authorization: auth.accessToken,
    }
    if (auth.remoteUserId) headers["New-Api-User"] = auth.remoteUserId
    // type=2 → consumption logs; p=0 is the first page (newest first).
    const url = `${baseUrl.replace(/\/+$/, "")}/api/log/self?p=0&page_size=20&type=2`
    const response = await fetch(url, { headers })
    if (!response.ok) return null
    const payload = (await response.json()) as { data?: unknown }
    for (const entry of readLogRows(payload.data)) {
      const modelName =
        typeof entry.model_name === "string" ? entry.model_name : undefined
      if (modelName != null && modelName !== model) continue
      const createdAt = coerceFiniteNumber(entry.created_at)
      if (
        sinceSeconds != null &&
        createdAt != null &&
        createdAt < sinceSeconds
      ) {
        continue
      }
      const other = readLogOther(entry.other)
      if (!other) continue
      const ratio = coerceFiniteNumber(
        other.group_ratio ?? other.groupRatio ?? other.group,
      )
      if (ratio == null || !Number.isFinite(ratio) || ratio <= 0) continue
      return { groupRatio: ratio, modelName, other }
    }
    return null
  } catch {
    return null
  }
}
