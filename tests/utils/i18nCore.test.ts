import i18next, { t as i18nextT } from "i18next"
import { describe, expect, it } from "vitest"

import i18n, { t } from "~/utils/i18n/core"

describe("i18n core exports", () => {
  it("re-exports the shared i18next singleton and translation helper", () => {
    expect(i18n).toBe(i18next)
    expect(t).toBe(i18nextT)
  })
})
