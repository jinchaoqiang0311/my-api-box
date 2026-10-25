// @vitest-environment jsdom

import { describe, expect, it } from "vitest"

import {
  CONTENT_UI_HOST_TAG,
  isEventFromAllApiHubContentUi,
} from "~/entrypoints/content/shared/contentUi"

describe("contentUi", () => {
  it("returns false for non-element targets", () => {
    expect(isEventFromAllApiHubContentUi(null)).toBe(false)
    expect(isEventFromAllApiHubContentUi(window)).toBe(false)
    expect(isEventFromAllApiHubContentUi(document)).toBe(false)
  })

  it("returns true for events retargeted to or nested inside the shared content UI host", () => {
    const host = document.createElement(CONTENT_UI_HOST_TAG)
    const nested = document.createElement("button")
    host.appendChild(nested)
    document.body.appendChild(host)

    expect(isEventFromAllApiHubContentUi(host)).toBe(true)
    expect(isEventFromAllApiHubContentUi(nested)).toBe(true)
  })

  it("returns false for elements outside the shared content UI host", () => {
    const outside = document.createElement("button")
    document.body.appendChild(outside)

    expect(isEventFromAllApiHubContentUi(outside)).toBe(false)
  })
})
