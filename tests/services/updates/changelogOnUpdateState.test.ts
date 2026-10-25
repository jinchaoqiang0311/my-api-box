import { beforeEach, describe, expect, it, vi } from "vitest"

import { Storage } from "@plasmohq/storage"

import { STORAGE_KEYS } from "~/services/core/storageKeys"
import { changelogOnUpdateState } from "~/services/updates/changelogOnUpdateState"

const { withExtensionStorageWriteLockMock } = vi.hoisted(() => ({
  withExtensionStorageWriteLockMock: vi.fn(
    async (_key: string, work: () => Promise<unknown>) => await work(),
  ),
}))

vi.mock("@plasmohq/storage", () => {
  const set = vi.fn()
  const get = vi.fn()
  const remove = vi.fn()

  function Storage(this: any) {
    this.set = set
    this.get = get
    this.remove = remove
  }

  ;(Storage as any).__mocks = { set, get, remove }

  return { Storage, __esModule: true }
})

vi.mock("~/services/core/storageWriteLock", () => ({
  withExtensionStorageWriteLock: withExtensionStorageWriteLockMock,
}))

describe("changelogOnUpdateState", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("stores trimmed pending versions and skips blank inputs", async () => {
    const { set } = (Storage as any).__mocks as {
      set: ReturnType<typeof vi.fn>
      get: ReturnType<typeof vi.fn>
      remove: ReturnType<typeof vi.fn>
    }

    await changelogOnUpdateState.setPendingVersion("  3.31.1  ")
    await changelogOnUpdateState.setPendingVersion("   ")

    expect(withExtensionStorageWriteLockMock).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenCalledWith(
      STORAGE_KEYS.CHANGELOG_ON_UPDATE_PENDING_VERSION,
      "3.31.1",
    )
  })

  it("returns null when no pending version exists", async () => {
    const { get, remove } = (Storage as any).__mocks as {
      set: ReturnType<typeof vi.fn>
      get: ReturnType<typeof vi.fn>
      remove: ReturnType<typeof vi.fn>
    }
    get.mockResolvedValueOnce(null)

    await expect(changelogOnUpdateState.consumePendingVersion()).resolves.toBe(
      null,
    )
    expect(remove).not.toHaveBeenCalled()
  })

  it("cleans up invalid stored values and blank strings", async () => {
    const { get, remove } = (Storage as any).__mocks as {
      set: ReturnType<typeof vi.fn>
      get: ReturnType<typeof vi.fn>
      remove: ReturnType<typeof vi.fn>
    }

    get.mockResolvedValueOnce({ version: "3.31.1" })
    await expect(changelogOnUpdateState.consumePendingVersion()).resolves.toBe(
      null,
    )

    get.mockResolvedValueOnce("   ")
    await expect(changelogOnUpdateState.consumePendingVersion()).resolves.toBe(
      null,
    )

    expect(remove).toHaveBeenCalledTimes(2)
    expect(remove).toHaveBeenCalledWith(
      STORAGE_KEYS.CHANGELOG_ON_UPDATE_PENDING_VERSION,
    )
  })

  it("returns the trimmed pending version and removes it after consuming", async () => {
    const { get, remove } = (Storage as any).__mocks as {
      set: ReturnType<typeof vi.fn>
      get: ReturnType<typeof vi.fn>
      remove: ReturnType<typeof vi.fn>
    }
    get.mockResolvedValueOnce("  3.31.2  ")

    await expect(changelogOnUpdateState.consumePendingVersion()).resolves.toBe(
      "3.31.2",
    )
    expect(remove).toHaveBeenCalledWith(
      STORAGE_KEYS.CHANGELOG_ON_UPDATE_PENDING_VERSION,
    )
  })
})
