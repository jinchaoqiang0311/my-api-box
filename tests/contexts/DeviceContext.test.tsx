import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { DeviceProvider, useDevice } from "~/contexts/DeviceContext"

const TEST_IDS = {
  isTouch: "is-touch",
  isMobile: "is-mobile",
  isTablet: "is-tablet",
  isDesktop: "is-desktop",
} as const

type MatchMediaConfig = {
  mobile?: boolean
  tablet?: boolean
  desktop?: boolean
  coarse?: boolean
}

function installMatchMedia(config: MatchMediaConfig) {
  const listeners = new Map<string, Set<() => void>>()

  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => {
      const queryListeners = listeners.get(query) ?? new Set<() => void>()
      listeners.set(query, queryListeners)

      const matches =
        query === "(max-width: 767px)"
          ? Boolean(config.mobile)
          : query === "(min-width: 768px) and (max-width: 1023px)"
            ? Boolean(config.tablet)
            : query === "(min-width: 1024px)"
              ? Boolean(config.desktop)
              : Boolean(config.coarse)

      return {
        matches,
        media: query,
        onchange: null,
        addEventListener: vi.fn((_event: string, listener: () => void) => {
          queryListeners.add(listener)
        }),
        removeEventListener: vi.fn((_event: string, listener: () => void) => {
          queryListeners.delete(listener)
        }),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }
    }),
  )
}

const Probe = ({ children }: { children?: ReactNode }) => {
  const context = useDevice()

  return (
    <div>
      <div data-testid={TEST_IDS.isTouch}>{String(context.isTouchDevice)}</div>
      <div data-testid={TEST_IDS.isMobile}>{String(context.isMobile)}</div>
      <div data-testid={TEST_IDS.isTablet}>{String(context.isTablet)}</div>
      <div data-testid={TEST_IDS.isDesktop}>{String(context.isDesktop)}</div>
      {children}
    </div>
  )
}

describe("DeviceContext", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    delete (window as Window & { ontouchstart?: unknown }).ontouchstart
    Object.defineProperty(globalThis.navigator, "maxTouchPoints", {
      value: 0,
      configurable: true,
    })
  })

  it("throws when useDevice is used outside the provider", () => {
    const BrokenConsumer = () => {
      useDevice()
      return null
    }

    expect(() => render(<BrokenConsumer />)).toThrow(
      "useDevice must be used within a DeviceProvider",
    )
  })

  it("detects a touch mobile device from navigator touch points", () => {
    installMatchMedia({
      mobile: true,
      tablet: false,
      desktop: false,
      coarse: false,
    })
    Object.defineProperty(globalThis.navigator, "maxTouchPoints", {
      value: 3,
      configurable: true,
    })

    render(
      <DeviceProvider>
        <Probe />
      </DeviceProvider>,
    )

    expect(screen.getByTestId(TEST_IDS.isTouch)).toHaveTextContent("true")
    expect(screen.getByTestId(TEST_IDS.isMobile)).toHaveTextContent("true")
    expect(screen.getByTestId(TEST_IDS.isTablet)).toHaveTextContent("false")
    expect(screen.getByTestId(TEST_IDS.isDesktop)).toHaveTextContent("false")
  })

  it("detects touch capability from coarse pointers when no touch globals are present", () => {
    installMatchMedia({
      mobile: false,
      tablet: true,
      desktop: false,
      coarse: true,
    })

    render(
      <DeviceProvider>
        <Probe />
      </DeviceProvider>,
    )

    expect(screen.getByTestId(TEST_IDS.isTouch)).toHaveTextContent("true")
    expect(screen.getByTestId(TEST_IDS.isMobile)).toHaveTextContent("false")
    expect(screen.getByTestId(TEST_IDS.isTablet)).toHaveTextContent("true")
    expect(screen.getByTestId(TEST_IDS.isDesktop)).toHaveTextContent("false")
  })

  it("detects desktop devices from viewport breakpoints when touch is unavailable", () => {
    installMatchMedia({
      mobile: false,
      tablet: false,
      desktop: true,
      coarse: false,
    })

    render(
      <DeviceProvider>
        <Probe />
      </DeviceProvider>,
    )

    expect(screen.getByTestId(TEST_IDS.isTouch)).toHaveTextContent("false")
    expect(screen.getByTestId(TEST_IDS.isMobile)).toHaveTextContent("false")
    expect(screen.getByTestId(TEST_IDS.isTablet)).toHaveTextContent("false")
    expect(screen.getByTestId(TEST_IDS.isDesktop)).toHaveTextContent("true")
  })
})
