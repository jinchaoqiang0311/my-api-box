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
  return t(`siteProbing:verdicts.${verdict}`)
}

/** Translate a probe result summary through its summaryKey. */
export function translateProbeSummary(
  t: TFunction,
  result: ProbeResult,
): string {
  return t(`siteProbing:${result.summaryKey}`, result.summaryParams)
}
