import { beforeEach, describe, expect, it, vi } from "vitest"

const { waitForUserInfoMock } = vi.hoisted(() => ({
  waitForUserInfoMock: vi.fn(),
}))

vi.mock("~/entrypoints/content/messageHandlers/utils/userInfo", () => ({
  waitForUserInfo: waitForUserInfoMock,
}))

describe("handleWaitAndGetUserInfo", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.resetAllMocks()
  })

  it("keeps the channel open and returns user info when polling succeeds", async () => {
    waitForUserInfoMock.mockResolvedValue({
      userId: "user-1",
      user: { id: "user-1", role: "admin" },
    })

    const { handleWaitAndGetUserInfo } = await import(
      "~/entrypoints/content/messageHandlers/handlers/waitUserInfo"
    )
    const sendResponse = vi.fn()

    expect(handleWaitAndGetUserInfo({}, sendResponse)).toBe(true)

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        data: {
          userId: "user-1",
          user: { id: "user-1", role: "admin" },
        },
      })
    })
  })

  it("returns an error response when user polling rejects", async () => {
    waitForUserInfoMock.mockRejectedValue(new Error("timed out"))

    const { handleWaitAndGetUserInfo } = await import(
      "~/entrypoints/content/messageHandlers/handlers/waitUserInfo"
    )
    const sendResponse = vi.fn()

    expect(handleWaitAndGetUserInfo({}, sendResponse)).toBe(true)

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: "timed out",
      })
    })
  })
})
