// @vitest-environment jsdom

import { describe, expect, it } from "vitest"

import { isLikelyCopyActionTarget } from "~/entrypoints/content/shared/copyActionTarget"

describe("copyActionTarget", () => {
  it("returns false for null, non-elements, and elements without a copy-like candidate", () => {
    expect(isLikelyCopyActionTarget(null)).toBe(false)
    expect(isLikelyCopyActionTarget(window)).toBe(false)

    const plainDiv = document.createElement("div")
    plainDiv.textContent = "Copy"

    expect(isLikelyCopyActionTarget(plainDiv)).toBe(false)
  })

  it("treats explicit clipboard-related data attributes as a copy intent", () => {
    const button = document.createElement("button")
    button.setAttribute("data-clipboard-text", "secret")

    expect(isLikelyCopyActionTarget(button)).toBe(true)
  })

  it("detects copy intent from semantic attributes in multiple languages", () => {
    const button = document.createElement("button")
    button.setAttribute("aria-label", "复制令牌")

    expect(isLikelyCopyActionTarget(button)).toBe(true)

    const tooltipLink = document.createElement("a")
    tooltipLink.setAttribute("data-tooltip-title", "копировать код")

    expect(isLikelyCopyActionTarget(tooltipLink)).toBe(true)
  })

  it("detects copy intent from visible text on a closest candidate ancestor", () => {
    const button = document.createElement("button")
    button.textContent = "Copy code"
    const icon = document.createElement("span")
    button.appendChild(icon)

    expect(isLikelyCopyActionTarget(icon)).toBe(true)
  })

  it("falls back to id and class names when text and semantic attributes are absent", () => {
    const idButton = document.createElement("button")
    idButton.id = "copy-token-button"

    expect(isLikelyCopyActionTarget(idButton)).toBe(true)

    const classButton = document.createElement("button")
    classButton.className = "clipboard-trigger"

    expect(isLikelyCopyActionTarget(classButton)).toBe(true)
  })

  it("returns false for copy-like candidates whose metadata does not indicate a copy action", () => {
    const submit = document.createElement("input")
    submit.type = "submit"
    submit.value = "Save changes"
    submit.setAttribute("title", "submit form")

    expect(isLikelyCopyActionTarget(submit)).toBe(false)
  })
})
