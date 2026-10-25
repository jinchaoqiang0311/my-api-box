/** Suite runner: executes the selected probes sequentially for one account. */

import { computeBaselineKey, consistencyProbe } from "./consistency"
import {
  billingProbe,
  cacheProbe,
  identityProbe,
  injectionProbe,
  reachProbe,
  streamProbe,
} from "./probes"
import {
  loadProbeBaseline,
  saveProbeBaseline,
  saveProbeReport,
} from "./storage"
import {
  ALL_PROBE_IDS,
  PROBE_IDS,
  type ProbeCredentials,
  type ProbeId,
  type ProbeReport,
  type ProbeResult,
} from "./types"

export interface RunSuiteOptions {
  accountId: string
  credentials: ProbeCredentials
  selected: ProbeId[]
  /** Called after each probe completes for live UI updates. */
  onResult?: (partial: ProbeResult) => void
}

/** Builds an unknown-verdict result for an unexpected probe failure. */
function errorResult(probeId: ProbeId, error: unknown): ProbeResult {
  return {
    probeId,
    verdict: "unknown",
    summaryKey: "summaries.probeError",
    summaryParams: { error: String(error) },
    evidence: { error: String(error) },
    at: Date.now(),
  }
}

/**
 * Runs the selected probes in a stable order and persists the report plus
 * any new consistency baseline. Returns the full report.
 */
export async function runProbeSuite(
  options: RunSuiteOptions,
): Promise<ProbeReport> {
  const { accountId, credentials, selected, onResult } = options
  const results: ProbeResult[] = []
  const emit = (single: ProbeResult) => {
    results.push(single)
    onResult?.(single)
  }

  for (const probeId of ALL_PROBE_IDS) {
    if (!selected.includes(probeId)) continue
    try {
      switch (probeId) {
        case PROBE_IDS.Reach:
          emit(await reachProbe.run(credentials))
          break
        case PROBE_IDS.Identity:
          emit(await identityProbe.run(credentials))
          break
        case PROBE_IDS.Injection:
          emit(await injectionProbe.run(credentials))
          break
        case PROBE_IDS.Cache:
          emit(await cacheProbe.run(credentials))
          break
        case PROBE_IDS.Stream:
          emit(await streamProbe.run(credentials))
          break
        case PROBE_IDS.Billing:
          emit(await billingProbe.run(credentials))
          break
        case PROBE_IDS.Consistency: {
          const outcome = await consistencyProbe.run(
            credentials,
            loadProbeBaseline,
          )
          emit(outcome.result)
          if (outcome.baseline) {
            await saveProbeBaseline(
              computeBaselineKey(credentials),
              outcome.baseline,
            )
          }
          break
        }
        default:
          break
      }
    } catch (error) {
      emit(errorResult(probeId, error))
    }
  }

  const report: ProbeReport = {
    accountId,
    origin: credentials.baseUrl.replace(/\/+$/, ""),
    model: credentials.model,
    at: Date.now(),
    results,
  }
  await saveProbeReport(report)
  return report
}
