import { beforeEach, describe, expect, it, vi } from "vitest"

import { Storage } from "@plasmohq/storage"

import {
  hasNewOptionalPermissions,
  setLastSeenOptionalPermissions,
} from "~/services/permissions/optionalPermissionState"

vi.mock("@plasmohq/storage", () => {
  const set = vi.fn()
  const get = vi.fn()

  function Storage(this: any) {
    this.set = set
    this.get = get
  }

  ;(Storage as any).__mocks = { set, get }

  return { Storage, __esModule: true }
})

vi.mock("~/services/permissions/permissionManager", () => ({
  OPTIONAL_PERMISSIONS: ["cookies", "webRequest", "clipboardRead"],
}))

describe("optionalPermissionState", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("stores the last-seen permissions in sorted order", async () => {
    const { set } = (Storage as any).__mocks as {
      set: ReturnType<typeof vi.fn>
      get: ReturnType<typeof vi.fn>
    }

    await setLastSeenOptionalPermissions(["webRequest", "cookies"])

    expect(set).toHaveBeenCalledWith("optional_permissions_state", {
      lastSeen: ["cookies", "webRequest"],
    })
  })

  it("uses the current optional-permission list by default", async () => {
    const { set } = (Storage as any).__mocks as {
      set: ReturnType<typeof vi.fn>
      get: ReturnType<typeof vi.fn>
    }

    await setLastSeenOptionalPermissions()

    expect(set).toHaveBeenCalledWith("optional_permissions_state", {
      lastSeen: ["clipboardRead", "cookies", "webRequest"],
    })
  })

  it("reports new permissions when there is no stored state or reads fail", async () => {
    const { get } = (Storage as any).__mocks as {
      set: ReturnType<typeof vi.fn>
      get: ReturnType<typeof vi.fn>
    }

    get.mockResolvedValueOnce(null)
    await expect(hasNewOptionalPermissions(["cookies"])).resolves.toBe(true)

    get.mockRejectedValueOnce(new Error("read failed"))
    await expect(hasNewOptionalPermissions(["cookies"])).resolves.toBe(true)
  })

  it("detects whether the current permission set adds anything new", async () => {
    const { get } = (Storage as any).__mocks as {
      set: ReturnType<typeof vi.fn>
      get: ReturnType<typeof vi.fn>
    }

    get.mockResolvedValueOnce({ lastSeen: ["cookies", "webRequest"] })
    await expect(
      hasNewOptionalPermissions(["cookies", "webRequest"]),
    ).resolves.toBe(false)

    get.mockResolvedValueOnce({ lastSeen: ["cookies"] })
    await expect(
      hasNewOptionalPermissions(["cookies", "clipboardRead"]),
    ).resolves.toBe(true)
  })

  it("swallows storage write failures when recording last-seen permissions", async () => {
    const { set } = (Storage as any).__mocks as {
      set: ReturnType<typeof vi.fn>
      get: ReturnType<typeof vi.fn>
    }
    set.mockRejectedValueOnce(new Error("write failed"))

    await expect(
      setLastSeenOptionalPermissions(["cookies", "webRequest"]),
    ).resolves.toBeUndefined()
  })
})
