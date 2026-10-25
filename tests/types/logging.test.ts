import { describe, expect, it } from "vitest"

import { getDefaultLoggingPreferences } from "~/types/logging"

describe("logging defaults", () => {
  it("enables verbose logging in development mode", () => {
    expect(getDefaultLoggingPreferences("development")).toEqual({
      consoleEnabled: true,
      level: "debug",
    })
  })

  it("keeps test mode quiet by default", () => {
    expect(getDefaultLoggingPreferences("test")).toEqual({
      consoleEnabled: false,
      level: "debug",
    })
  })

  it("falls back to production-style defaults for unknown modes", () => {
    expect(getDefaultLoggingPreferences("production")).toEqual({
      consoleEnabled: true,
      level: "info",
    })
    expect(getDefaultLoggingPreferences("staging")).toEqual({
      consoleEnabled: true,
      level: "info",
    })
  })
})
