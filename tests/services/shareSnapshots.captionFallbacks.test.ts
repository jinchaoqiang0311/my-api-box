import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  buildAccountShareSnapshotPayload,
  buildOverviewShareSnapshotPayload,
  generateShareSnapshotCaption,
} from "~/services/sharing/shareSnapshots"

const mocks = vi.hoisted(() => ({
  language: "cimode",
  t: vi.fn((key: string) => (key === "ui:app.name" ? "" : key)),
}))

vi.mock("~/utils/i18n/core", () => ({
  default: {
    get language() {
      return mocks.language
    },
  },
  t: (key: string) => mocks.t(key),
}))

describe("shareSnapshots caption fallbacks", () => {
  beforeEach(() => {
    mocks.language = "cimode"
    mocks.t.mockReset()
    mocks.t.mockImplementation((key: string) =>
      key === "ui:app.name" ? "" : key,
    )
  })

  it("falls back to the app watermark when the app-name translation is unavailable", () => {
    const payload = buildAccountShareSnapshotPayload({
      currencyType: "USD",
      siteName: "Example Site",
      originUrl: "   ",
      balance: 12.34,
      includeTodayCashflow: false,
      asOf: 1700000000000,
      backgroundSeed: 1,
    })

    const caption = generateShareSnapshotCaption(payload)

    expect(caption).toContain("My API Box — Example Site")
    expect(caption).toContain("shareSnapshots:labels.balance")
    expect(caption).not.toContain("https://")
  })

  it("uses the translated app name when localization is available", () => {
    mocks.language = "zh_CN"
    mocks.t.mockImplementation((key: string) =>
      key === "ui:app.name" ? "Localized Hub" : key,
    )

    const payload = buildOverviewShareSnapshotPayload({
      currencyType: "USD",
      enabledAccountCount: 2,
      totalBalance: 123.45,
      includeTodayCashflow: false,
      asOf: 1700000000000,
      backgroundSeed: 1,
    })

    const caption = generateShareSnapshotCaption(payload)

    expect(caption).toContain("Localized Hub — shareSnapshots:labels.overview")
    expect(caption).toContain("shareSnapshots:labels.asOf")
  })
})
