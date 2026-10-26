import { describe, expect, it } from "vitest"

import { sanitizeProbeReport } from "~/services/communitySubmission/sanitizer"
import { PROBE_IDS, type ProbeReport } from "~/services/probeSystem/types"

const report: ProbeReport = {
  accountId: "local-account-id-must-not-be-uploaded",
  origin: "https://relay.example.com/",
  model: "gpt-4o",
  at: 1_792_924_800_000,
  results: [
    {
      probeId: PROBE_IDS.Reach,
      verdict: "pass",
      summaryKey: "summaries.reachOk",
      summaryParams: { ms: 420 },
      evidence: { latencyMs: 420, apiKey: "sk-secret-must-not-be-uploaded" },
      at: 1_792_924_800_000,
    },
  ],
}

describe("sanitizeProbeReport station URL privacy", () => {
  it("omits the cleartext station URL when hashing is enabled", async () => {
    const payload = await sanitizeProbeReport(report, {
      extensionVersion: "1.0.0",
      siteType: "new-api",
      hashStationUrl: true,
    })

    expect(payload).not.toHaveProperty("station_url")
    expect(payload.station_hash).toMatch(/^[a-f0-9]{16}$/)
    expect(JSON.stringify(payload)).not.toContain("relay.example.com")
    expect(JSON.stringify(payload)).not.toContain("sk-secret")
    expect(JSON.stringify(payload)).not.toContain("local-account-id")
  })

  it("includes the normalized station URL only when hashing is disabled", async () => {
    const payload = await sanitizeProbeReport(report, {
      extensionVersion: "1.0.0",
      siteType: "new-api",
      hashStationUrl: false,
    })

    expect(payload.station_url).toBe("https://relay.example.com")
    expect(payload).not.toHaveProperty("station_hash")
    expect(JSON.stringify(payload)).not.toContain("sk-secret")
    expect(JSON.stringify(payload)).not.toContain("local-account-id")
  })
})
