// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createMeshGradientPlan: vi.fn(),
}))

vi.mock("~/services/sharing/shareSnapshots/meshGradient", () => ({
  createMeshGradientPlan: mocks.createMeshGradientPlan,
}))

const createGradientStub = () => ({
  addColorStop: vi.fn(),
})

const createCanvasElementMock = (
  factory: () => HTMLCanvasElement,
  originalCreateElement: typeof document.createElement,
) =>
  vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
    if (tagName.toLowerCase() === "canvas") {
      return factory()
    }

    return originalCreateElement(tagName)
  }) as typeof document.createElement)

const createMockContext = () => {
  const linearGradients: ReturnType<typeof createGradientStub>[] = []
  const radialGradients: ReturnType<typeof createGradientStub>[] = []
  const fillRectCalls: Array<{
    fillStyle: unknown
    globalCompositeOperation: string
    globalAlpha: number
    filter: string
  }> = []

  const ctx = {
    fillStyle: "",
    filter: "",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    fillRect: () => {
      fillRectCalls.push({
        fillStyle: ctx.fillStyle,
        globalCompositeOperation: ctx.globalCompositeOperation,
        globalAlpha: ctx.globalAlpha,
        filter: ctx.filter,
      })
    },
    createLinearGradient: () => {
      const gradient = createGradientStub()
      linearGradients.push(gradient)
      return gradient
    },
    createRadialGradient: () => {
      const gradient = createGradientStub()
      radialGradients.push(gradient)
      return gradient
    },
    createPattern: vi.fn(
      () => ({ kind: "pattern" }) as unknown as CanvasPattern,
    ),
  }

  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    fillRectCalls,
    createPattern: ctx.createPattern,
    linearGradients,
    radialGradients,
  }
}

describe("meshGradientBackground", () => {
  const originalCreateElement = document.createElement.bind(document)

  beforeEach(() => {
    mocks.createMeshGradientPlan.mockReset()
    mocks.createMeshGradientPlan.mockReturnValue({
      baseAngle: 0.25,
      rotation: 0.1,
      scale: 1.05,
      saturation: 2,
      blurPx: 32,
      base: {
        start: "#112233",
        end: "#445566",
      },
      blobs: [
        {
          x: 20,
          y: 30,
          radius: 40,
          rotation: 0.2,
          scaleX: 1.1,
          scaleY: 0.9,
          color: "#ff0000",
          alpha: 0.8,
        },
      ],
      highlights: [
        {
          x: 60,
          y: 70,
          radius: 20,
          rotation: 0.4,
          scaleX: 0.8,
          scaleY: 1.2,
          color: "#00ff00",
          alpha: 0.5,
        },
      ],
      noise: {
        tileSize: 4,
        alpha: 0.4,
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("draws the grain overlay when a noise tile and repeat pattern are available", async () => {
    const putImageData = vi.fn()

    createCanvasElementMock(
      () =>
        ({
          width: 0,
          height: 0,
          getContext: () => ({
            createImageData: (width: number, height: number) => ({
              data: new Uint8ClampedArray(width * height * 4),
            }),
            putImageData,
          }),
        }) as unknown as HTMLCanvasElement,
      originalCreateElement,
    )

    const { drawMeshGradientBackground } = await import(
      "~/services/sharing/shareSnapshots/meshGradientBackground"
    )
    const { ctx, fillRectCalls, createPattern } = createMockContext()

    drawMeshGradientBackground(ctx, {
      seed: 123,
      width: 200,
      height: 120,
    })

    expect(putImageData).toHaveBeenCalledTimes(1)
    expect(createPattern).toHaveBeenCalledWith(
      expect.objectContaining({ width: 4, height: 4 }),
      "repeat",
    )
    expect(
      fillRectCalls.some(
        (call) =>
          call.fillStyle &&
          typeof call.fillStyle === "object" &&
          call.globalCompositeOperation === "soft-light" &&
          call.globalAlpha === 0.04,
      ),
    ).toBe(true)
  })

  it("skips the grain overlay when the noise tile canvas cannot create a 2d context", async () => {
    createCanvasElementMock(
      () =>
        ({
          width: 0,
          height: 0,
          getContext: () => null,
        }) as unknown as HTMLCanvasElement,
      originalCreateElement,
    )

    const { drawMeshGradientBackground } = await import(
      "~/services/sharing/shareSnapshots/meshGradientBackground"
    )
    const { ctx, fillRectCalls, createPattern } = createMockContext()

    expect(() =>
      drawMeshGradientBackground(ctx, {
        seed: 123,
        width: 200,
        height: 120,
      }),
    ).not.toThrow()

    expect(createPattern).not.toHaveBeenCalled()
    expect(fillRectCalls.length).toBeGreaterThan(0)
  })

  it("skips the grain overlay when repeat patterns cannot be created", async () => {
    const putImageData = vi.fn()

    createCanvasElementMock(
      () =>
        ({
          width: 0,
          height: 0,
          getContext: () => ({
            createImageData: (width: number, height: number) => ({
              data: new Uint8ClampedArray(width * height * 4),
            }),
            putImageData,
          }),
        }) as unknown as HTMLCanvasElement,
      originalCreateElement,
    )

    const { drawMeshGradientBackground } = await import(
      "~/services/sharing/shareSnapshots/meshGradientBackground"
    )
    const { ctx, fillRectCalls, createPattern } = createMockContext()
    vi.mocked(createPattern).mockReturnValue(null as any)

    drawMeshGradientBackground(ctx, {
      seed: 123,
      width: 200,
      height: 120,
    })

    expect(putImageData).toHaveBeenCalledTimes(1)
    expect(createPattern).toHaveBeenCalledTimes(1)
    expect(
      fillRectCalls.some(
        (call) => call.globalCompositeOperation === "soft-light",
      ),
    ).toBe(true)
    expect(
      fillRectCalls.some(
        (call) =>
          call.fillStyle &&
          typeof call.fillStyle === "object" &&
          call.globalAlpha === 0.04,
      ),
    ).toBe(false)
  })

  it("tolerates environments without document access and non-hash colors", async () => {
    mocks.createMeshGradientPlan.mockReturnValueOnce({
      baseAngle: 0.25,
      rotation: 0.1,
      scale: 1.05,
      saturation: 2,
      blurPx: 32,
      base: {
        start: "112233",
        end: "445566",
      },
      blobs: [
        {
          x: 20,
          y: 30,
          radius: 40,
          rotation: 0.2,
          scaleX: 1.1,
          scaleY: 0.9,
          color: "ff0000",
          alpha: 0.8,
        },
      ],
      highlights: [
        {
          x: 60,
          y: 70,
          radius: 20,
          rotation: 0.4,
          scaleX: 0.8,
          scaleY: 1.2,
          color: "00ff00",
          alpha: 0.5,
        },
      ],
      noise: {
        tileSize: 4,
        alpha: 0.4,
      },
    })

    const originalDocument = globalThis.document
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: undefined,
    })

    try {
      const { drawMeshGradientBackground } = await import(
        "~/services/sharing/shareSnapshots/meshGradientBackground"
      )
      const { ctx, createPattern, linearGradients, radialGradients } =
        createMockContext()

      drawMeshGradientBackground(ctx, {
        seed: 123,
        width: 200,
        height: 120,
      })

      expect(createPattern).not.toHaveBeenCalled()
      expect(linearGradients[0]?.addColorStop).toHaveBeenNthCalledWith(
        1,
        0,
        "112233",
      )
      expect(radialGradients[0]?.addColorStop).toHaveBeenNthCalledWith(
        1,
        0,
        "rgba(255, 0, 0, 0.8)",
      )
      expect(radialGradients[1]?.addColorStop).toHaveBeenNthCalledWith(
        1,
        0,
        "rgba(0, 255, 0, 0.5)",
      )
    } finally {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: originalDocument,
      })
    }
  })
})
