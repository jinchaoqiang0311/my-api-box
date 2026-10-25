import { beforeEach, describe, expect, it, vi } from "vitest"

const { showShieldBypassPromptToastMock } = vi.hoisted(() => ({
  showShieldBypassPromptToastMock: vi.fn(),
}))

vi.mock(
  "~/entrypoints/content/shieldBypassAssist/utils/shieldBypassToasts",
  () => ({
    showShieldBypassPromptToast: showShieldBypassPromptToastMock,
  }),
)

describe("handleShowShieldBypassUi", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.resetAllMocks()
  })

  it("shows the shield-bypass prompt toast and returns a success response", async () => {
    showShieldBypassPromptToastMock.mockResolvedValue(undefined)

    const { handleShowShieldBypassUi } = await import(
      "~/entrypoints/content/messageHandlers/handlers/shieldBypassUi"
    )
    const sendResponse = vi.fn()

    await expect(
      handleShowShieldBypassUi(
        {
          action: "content_show_shield_bypass_ui" as any,
        },
        sendResponse,
      ),
    ).resolves.toBe(true)

    expect(showShieldBypassPromptToastMock).toHaveBeenCalledTimes(1)
    expect(sendResponse).toHaveBeenCalledWith({ success: true })
  })

  it("returns a structured error response when showing the prompt toast fails", async () => {
    showShieldBypassPromptToastMock.mockRejectedValue(new Error("toast failed"))

    const { handleShowShieldBypassUi } = await import(
      "~/entrypoints/content/messageHandlers/handlers/shieldBypassUi"
    )
    const sendResponse = vi.fn()

    await expect(
      handleShowShieldBypassUi(
        {
          action: "content_show_shield_bypass_ui" as any,
        },
        sendResponse,
      ),
    ).resolves.toBe(true)

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: "toast failed",
    })
  })
})
