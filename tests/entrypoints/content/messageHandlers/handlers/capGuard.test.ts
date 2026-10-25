import { beforeEach, describe, expect, it, vi } from "vitest"

import { handleCheckCapGuard } from "~/entrypoints/content/messageHandlers/handlers/capGuard"

const {
  clearCapAutoStartStateMock,
  detectCapChallengePageMock,
  loggerMocks,
  maybeAutoStartCapChallengeMock,
} = vi.hoisted(() => ({
  clearCapAutoStartStateMock: vi.fn(),
  detectCapChallengePageMock: vi.fn(),
  loggerMocks: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  maybeAutoStartCapChallengeMock: vi.fn(),
}))

vi.mock("~/utils/core/logger", () => ({
  createLogger: () => loggerMocks,
}))

vi.mock("~/entrypoints/content/messageHandlers/utils/capGuard", () => ({
  clearCapAutoStartState: clearCapAutoStartStateMock,
  detectCapChallengePage: detectCapChallengePageMock,
  maybeAutoStartCapChallenge: maybeAutoStartCapChallengeMock,
}))

describe("content CAP guard handler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("starts CAP auto-triggering when the page is still blocked", () => {
    const detection = {
      apiEndpoint: "/__cap_clearance",
      isChallenge: true,
      reasons: ["cap-widget"],
      score: 4,
      title: "Blocked",
      url: "https://example.com/checkpoint",
    }
    detectCapChallengePageMock.mockReturnValue(detection)
    maybeAutoStartCapChallengeMock.mockReturnValue({
      attempted: true,
      method: "click",
      reason: "clicked",
    })

    const sendResponse = vi.fn()

    expect(handleCheckCapGuard({ requestId: "req-cap" }, sendResponse)).toBe(
      true,
    )

    expect(maybeAutoStartCapChallengeMock).toHaveBeenCalledWith({
      detection,
      requestId: "req-cap",
    })
    expect(clearCapAutoStartStateMock).not.toHaveBeenCalled()
    expect(loggerMocks.debug).toHaveBeenCalledWith(
      "CAP guard auto-start attempt",
      expect.objectContaining({
        attempted: true,
        detection: {
          reasons: ["cap-widget"],
          score: 4,
        },
        method: "click",
        reason: "clicked",
        requestId: "req-cap",
      }),
    )
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      passed: false,
      detection,
    })
  })

  it("clears request auto-start state when the page already passed CAP", () => {
    const detection = {
      apiEndpoint: null,
      isChallenge: false,
      reasons: [],
      score: 0,
      title: "Home",
      url: "https://example.com/home",
    }
    detectCapChallengePageMock.mockReturnValue(detection)

    const sendResponse = vi.fn()

    expect(handleCheckCapGuard({ requestId: "req-clear" }, sendResponse)).toBe(
      true,
    )

    expect(clearCapAutoStartStateMock).toHaveBeenCalledWith("req-clear")
    expect(maybeAutoStartCapChallengeMock).not.toHaveBeenCalled()
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      passed: true,
      detection,
    })
  })

  it("logs a null request id when a challenge check has no request context", () => {
    const detection = {
      apiEndpoint: "/__cap_clearance",
      isChallenge: true,
      reasons: ["cap-widget"],
      score: 4,
      title: "Blocked",
      url: "https://example.com/checkpoint",
    }
    detectCapChallengePageMock.mockReturnValue(detection)
    maybeAutoStartCapChallengeMock.mockReturnValue({
      attempted: false,
      method: "none",
      reason: "missingRequestId",
    })

    const sendResponse = vi.fn()

    expect(handleCheckCapGuard({}, sendResponse)).toBe(true)

    expect(maybeAutoStartCapChallengeMock).toHaveBeenCalledWith({
      detection,
      requestId: undefined,
    })
    expect(loggerMocks.debug).toHaveBeenCalledWith(
      "CAP guard auto-start attempt",
      expect.objectContaining({
        requestId: null,
        reason: "missingRequestId",
      }),
    )
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      passed: false,
      detection,
    })
  })

  it("returns a sanitized error when CAP detection fails", () => {
    detectCapChallengePageMock.mockImplementation(() => {
      throw new Error("cap exploded")
    })

    const sendResponse = vi.fn()

    expect(handleCheckCapGuard({ requestId: "req-error" }, sendResponse)).toBe(
      true,
    )

    expect(loggerMocks.warn).toHaveBeenCalledWith("CAP guard check failed", {
      error: "cap exploded",
    })
    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: "cap exploded",
    })
  })
})
