/** Persistence for probe reports and consistency baselines. */

import { Storage } from "@plasmohq/storage"

import type { ProbeBaseline } from "./consistency"
import type { ProbeReport } from "./types"

const REPORTS_KEY = "probe.reports.v1"
const BASELINES_KEY = "probe.baselines.v1"

/** Keep at most this many stored reports (per account+model run). */
const REPORT_LIMIT = 60

type ReportStore = Record<string, ProbeReport>
type BaselineStore = Record<string, ProbeBaseline>

const storage = new Storage()

/** Builds the report storage key for one account and model. */
function reportKey(accountId: string, model: string): string {
  return `${accountId}|${model}`
}

/** Loads all stored probe reports. */
async function loadProbeReports(): Promise<ReportStore> {
  const value = await storage.get<ReportStore>(REPORTS_KEY)
  return value ?? {}
}

/** Stores one report, trimming the oldest entries beyond the cap. */
export async function saveProbeReport(report: ProbeReport): Promise<void> {
  const store = await loadProbeReports()
  store[reportKey(report.accountId, report.model)] = report
  const keys = Object.keys(store)
  if (keys.length > REPORT_LIMIT) {
    // Drop the oldest entries beyond the cap.
    const sorted = keys.sort(
      (a, b) => (store[a]?.at ?? 0) - (store[b]?.at ?? 0),
    )
    for (const key of sorted.slice(0, keys.length - REPORT_LIMIT)) {
      delete store[key]
    }
  }
  await storage.set(REPORTS_KEY, store)
}

/** Loads the consistency baseline for one storage key. */
export async function loadProbeBaseline(
  key: string,
): Promise<ProbeBaseline | null> {
  const store = (await storage.get<BaselineStore>(BASELINES_KEY)) ?? {}
  return store[key] ?? null
}

/** Stores the consistency baseline for one storage key. */
export async function saveProbeBaseline(
  key: string,
  baseline: ProbeBaseline,
): Promise<void> {
  const store = (await storage.get<BaselineStore>(BASELINES_KEY)) ?? {}
  store[key] = baseline
  await storage.set(BASELINES_KEY, store)
}
