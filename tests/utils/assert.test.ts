import { describe, expect, it } from "vitest"

import { assertNever } from "~/utils/core/assert"

describe("assertNever", () => {
  it("uses the custom message when one is provided", () => {
    expect(() => assertNever("legacy" as never, "custom failure")).toThrow(
      "custom failure",
    )
  })

  it("includes the unexpected value in the default error message", () => {
    expect(() => assertNever(42 as never)).toThrow("Unexpected value: 42")
  })
})
