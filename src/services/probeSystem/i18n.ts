/** i18n helpers for the site probing system (siteProbing namespace). */

import type { TFunction } from "i18next"

import { assertNever } from "~/utils/core/assert"

import {
  PROBE_IDS,
  type ProbeId,
  type ProbeResult,
  type ProbeVerdict,
} from "./types"

/** Localized label for one probe. */
export function getProbeLabel(t: TFunction, probeId: ProbeId): string {
  switch (probeId) {
    case PROBE_IDS.Reach:
      return t("siteProbing:probes.reach.label")
    case PROBE_IDS.Identity:
      return t("siteProbing:probes.identity.label")
    case PROBE_IDS.Injection:
      return t("siteProbing:probes.injection.label")
    case PROBE_IDS.Cache:
      return t("siteProbing:probes.cache.label")
    case PROBE_IDS.Stream:
      return t("siteProbing:probes.stream.label")
    case PROBE_IDS.Billing:
      return t("siteProbing:probes.billing.label")
    case PROBE_IDS.Consistency:
      return t("siteProbing:probes.consistency.label")
    default:
      return assertNever(probeId, "Unexpected probe id")
  }
}

/** Localized one-line hint explaining what a probe detects. */
export function getProbeHint(t: TFunction, probeId: ProbeId): string {
  switch (probeId) {
    case PROBE_IDS.Reach:
      return t("siteProbing:probes.reach.hint")
    case PROBE_IDS.Identity:
      return t("siteProbing:probes.identity.hint")
    case PROBE_IDS.Injection:
      return t("siteProbing:probes.injection.hint")
    case PROBE_IDS.Cache:
      return t("siteProbing:probes.cache.hint")
    case PROBE_IDS.Stream:
      return t("siteProbing:probes.stream.hint")
    case PROBE_IDS.Billing:
      return t("siteProbing:probes.billing.hint")
    case PROBE_IDS.Consistency:
      return t("siteProbing:probes.consistency.hint")
    default:
      return assertNever(probeId, "Unexpected probe id")
  }
}

/** Localized verdict label. */
export function getVerdictLabel(t: TFunction, verdict: ProbeVerdict): string {
  switch (verdict) {
    case "pass":
      return t("siteProbing:verdicts.pass")
    case "fail":
      return t("siteProbing:verdicts.fail")
    case "suspect":
      return t("siteProbing:verdicts.suspect")
    case "unknown":
      return t("siteProbing:verdicts.unknown")
    case "skip":
      return t("siteProbing:verdicts.skip")
    default:
      return assertNever(verdict, "Unexpected probe verdict")
  }
}

/**
 * Translate a probe result summary through its summaryKey.
 *
 * Every summaryKey is listed as a static string so the i18n extractor can
 * find all keys; template literals would be invisible to static analysis.
 */
export function translateProbeSummary(
  t: TFunction,
  result: ProbeResult,
): string {
  const params = result.summaryParams
  switch (result.summaryKey) {
    case "summaries.probeError":
      return t("siteProbing:summaries.probeError", params)
    case "summaries.reachOk":
      return t("siteProbing:summaries.reachOk", params)
    case "summaries.reachFail":
      return t("siteProbing:summaries.reachFail", params)
    case "summaries.reachError":
      return t("siteProbing:summaries.reachError", params)
    case "summaries.identityMatch":
      return t("siteProbing:summaries.identityMatch", params)
    case "summaries.identityMismatch":
      return t("siteProbing:summaries.identityMismatch", params)
    case "summaries.identityVague":
      return t("siteProbing:summaries.identityVague")
    case "summaries.injectionClean":
      return t("siteProbing:summaries.injectionClean")
    case "summaries.injectionSuspect":
      return t("siteProbing:summaries.injectionSuspect")
    case "summaries.cacheFresh":
      return t("siteProbing:summaries.cacheFresh")
    case "summaries.cacheHit":
      return t("siteProbing:summaries.cacheHit")
    case "summaries.cacheVague":
      return t("siteProbing:summaries.cacheVague")
    case "summaries.cacheOdd":
      return t("siteProbing:summaries.cacheOdd")
    case "summaries.streamOk":
      return t("siteProbing:summaries.streamOk", params)
    case "summaries.streamFake":
      return t("siteProbing:summaries.streamFake", params)
    case "summaries.streamNoMetric":
      return t("siteProbing:summaries.streamNoMetric")
    case "summaries.billingSkip":
      return t("siteProbing:summaries.billingSkip")
    case "summaries.billingNoUsage":
      return t("siteProbing:summaries.billingNoUsage", params)
    case "summaries.billingOk":
      return t("siteProbing:summaries.billingOk", params)
    case "summaries.billingOver":
      return t("siteProbing:summaries.billingOver", params)
    case "summaries.consistencyFirst":
      return t("siteProbing:summaries.consistencyFirst")
    case "summaries.consistencyStable":
      return t("siteProbing:summaries.consistencyStable")
    case "summaries.consistencyDrift":
      return t("siteProbing:summaries.consistencyDrift", params)
    default:
      return result.summaryKey
  }
}
