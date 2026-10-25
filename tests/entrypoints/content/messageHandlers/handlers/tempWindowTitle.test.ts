// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"

import { handleGetRenderedTitle } from "~/entrypoints/content/messageHandlers/handlers/tempWindowTitle"

const { loggerMocks } = vi.hoisted(() => ({
  loggerMocks: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock("~/utils/core/logger", () => ({
  createLogger: () => loggerMocks,
}))

describe("content temp-window title handler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    document.title = ""
  })

  it("returns the current rendered title", () => {
    document.title = "Account Overview"

    const sendResponse = vi.fn()

    expect(handleGetRenderedTitle({}, sendResponse)).toBe(true)
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      title: "Account Overview",
    })
  })

  it("normalizes non-string titles to an empty string", () => {
    const titleGetter = vi
      .spyOn(document, "title", "get")
      .mockReturnValue(undefined as any)

    const sendResponse = vi.fn()

    expect(handleGetRenderedTitle({}, sendResponse)).toBe(true)
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      title: "",
    })

    titleGetter.mockRestore()
  })

  it("returns an error response when reading the title throws", () => {
    const titleGetter = vi
      .spyOn(document, "title", "get")
      .mockImplementation(() => {
        throw new Error("title blocked")
      })

    const sendResponse = vi.fn()

    expect(handleGetRenderedTitle({}, sendResponse)).toBe(true)
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      "Failed to read rendered title",
      expect.objectContaining({
        message: "title blocked",
      }),
    )
    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: "title blocked",
    })

    titleGetter.mockRestore()
  })
})
