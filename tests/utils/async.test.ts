import { describe, expect, it, vi } from "vitest"

import { sleep } from "~/utils/core/async"

describe("async utilities", () => {
  it("resolves after the requested delay", async () => {
    vi.useFakeTimers()

    try {
      let resolved = false
      const promise = sleep(100).then(() => {
        resolved = true
      })

      await vi.advanceTimersByTimeAsync(99)
      expect(resolved).toBe(false)

      await vi.advanceTimersByTimeAsync(1)
      await promise
      expect(resolved).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
