import { afterEach, describe, expect, it, vi } from "vitest"

import { drawShareSnapshotOverlay } from "~/services/sharing/shareSnapshots/shareSnapshotOverlay"
import type { ShareSnapshotOverlayLabels } from "~/services/sharing/shareSnapshots/shareSnapshotOverlay"
import type { ShareSnapshotPayload } from "~/services/sharing/shareSnapshots/types"

/**
 * Unit tests for the share snapshot canvas overlay renderer.
 * Focuses on the `showTodayCashflow` behavior: placeholders when absent and a
 * today-net subline when present.
 */
const LABELS: ShareSnapshotOverlayLabels = {
  overview: "Overview",
  totalBalance: "Total balance",
  balance: "Balance",
  accounts: "Accounts",
  site: "Site",
  asOf: "As of",
  today: "Today",
  income: "Income",
  outcome: "Outcome",
  net: "Net",
}

const createMockContext = (options?: {
  getImageData?: CanvasRenderingContext2D["getImageData"]
  measureText?: (text: string, font: string) => { width: number }
}) => {
  const fillTextCalls: Array<{
    text: string
    x: number
    y: number
    fillStyle: string
    font: string
  }> = []

  const ctx = {
    font: "",
    textAlign: "left" as const,
    textBaseline: "top" as const,
    fillStyle: "",
    save: () => {},
    restore: () => {},
    measureText: (text: string) =>
      options?.measureText
        ? options.measureText(text, ctx.font)
        : { width: Math.max(0, text.length) * 10 },
    fillText: (text: string, x: number, y: number) => {
      fillTextCalls.push({
        text,
        x,
        y,
        fillStyle: ctx.fillStyle,
        font: ctx.font,
      })
    },
    getImageData:
      options?.getImageData ??
      (() => {
        throw new Error("Canvas readback not supported in unit test")
      }),
  }

  return { ctx: ctx as unknown as CanvasRenderingContext2D, fillTextCalls }
}

describe("shareSnapshotOverlay", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders placeholders and omits today net subline when today cashflow is absent", () => {
    const payload: ShareSnapshotPayload = {
      kind: "account",
      currencyType: "USD",
      siteName: "Example Site",
      balance: 12.34,
      asOf: 1700000000000,
      backgroundSeed: 1,
    }

    const { ctx, fillTextCalls } = createMockContext()

    drawShareSnapshotOverlay(ctx, {
      payload,
      width: 1200,
      height: 1200,
      locale: "en-US",
      watermarkText: "My API Box",
      labels: LABELS,
    })

    const texts = fillTextCalls.map((call) => call.text)
    const year = String(new Date(payload.asOf).getFullYear())

    expect(texts.filter((text) => text === "—").length).toBeGreaterThanOrEqual(
      2,
    )
    expect(texts).toContain("My API Box")
    expect(texts).toContain("As of")
    expect(texts.some((text) => text.includes(year))).toBe(true)
    expect(texts.some((text) => text.includes("Today"))).toBe(false)
  })

  it("renders today net subline when today cashflow values are present", () => {
    const payload: ShareSnapshotPayload = {
      kind: "account",
      currencyType: "USD",
      siteName: "Example Site",
      balance: 12.34,
      asOf: 1700000000000,
      backgroundSeed: 1,
      todayIncome: 2,
      todayOutcome: 1,
      todayNet: 1,
    }

    const { ctx, fillTextCalls } = createMockContext()

    drawShareSnapshotOverlay(ctx, {
      payload,
      width: 1200,
      height: 1200,
      locale: "en-US",
      watermarkText: "My API Box",
      labels: LABELS,
    })

    const texts = fillTextCalls.map((call) => call.text)

    expect(texts.some((text) => text.includes("Today"))).toBe(true)
    expect(texts.some((text) => text === "—")).toBe(false)
  })

  it("renders overview-specific labels, falls back from invalid locale formatting, and uses dark text on bright backgrounds", () => {
    vi.spyOn(Date.prototype, "toLocaleDateString").mockImplementation(
      function mockToLocaleDateString(locales?: Intl.LocalesArgument) {
        if (locales === "bad-locale") {
          throw new RangeError("unsupported locale")
        }
        return "fallback-date"
      },
    )

    const payload: ShareSnapshotPayload = {
      kind: "overview",
      currencyType: "USD",
      enabledAccountCount: 7,
      totalBalance: 42.5,
      asOf: Number.NaN,
      backgroundSeed: 1,
      todayIncome: 3,
      todayOutcome: 1,
      todayNet: 2,
    }

    const { ctx, fillTextCalls } = createMockContext({
      getImageData: () =>
        ({
          data: new Uint8ClampedArray([255, 255, 255, 255]),
        }) as ImageData,
    })

    drawShareSnapshotOverlay(ctx, {
      payload,
      width: 1200,
      height: 1200,
      locale: "bad-locale",
      watermarkText: "My API Box",
      labels: LABELS,
    })

    const texts = fillTextCalls.map((call) => call.text)
    const primaryHeroCall = fillTextCalls.find((call) => call.text === "$42.50")
    const accountsValueCall = fillTextCalls.find((call) => call.text === "7")

    expect(texts).toContain("Overview")
    expect(texts).toContain("Total balance")
    expect(texts).toContain("Accounts")
    expect(texts).toContain("fallback-date")
    expect(primaryHeroCall?.fillStyle).toBe("rgba(15, 23, 42, 0.92)")
    expect(accountsValueCall).toBeTruthy()
  })

  it("shrinks oversized hero text to the fallback minimum font and truncates narrow labels", () => {
    const payload: ShareSnapshotPayload = {
      kind: "account",
      currencyType: "USD",
      siteName: "Extremely Long Example Site Name",
      balance: 1234567.89,
      asOf: 1700000000000,
      backgroundSeed: 1,
    }

    const { ctx, fillTextCalls } = createMockContext({
      measureText: (text, font) => {
        const fontSizeMatch = font.match(/(\d+)px/)
        const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 10
        return { width: Math.max(0, text.length) * fontSize }
      },
    })

    drawShareSnapshotOverlay(ctx, {
      payload,
      width: 100,
      height: 160,
      locale: "en-US",
      watermarkText: "Watermark",
      labels: LABELS,
    })

    const heroValueCall = fillTextCalls.find((call) =>
      call.text.includes("$1234567.89"),
    )

    expect(heroValueCall?.font).toContain("700 8px")
    expect(fillTextCalls.some((call) => call.text.includes("…"))).toBe(true)
  })
})
