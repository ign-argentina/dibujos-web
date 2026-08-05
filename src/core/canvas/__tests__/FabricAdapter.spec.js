import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FabricAdapter } from '../FabricAdapter.js'

// Simular el módulo fabric
vi.mock('fabric', () => {
  class MockCanvas {
    constructor() {
      this.add = vi.fn()
      this.insertAt = vi.fn()
      this.remove = vi.fn()
      this.getActiveObject = vi.fn()
      this.setActiveObject = vi.fn()
      this.discardActiveObject = vi.fn()
      this.getObjects = vi.fn().mockReturnValue([])
      this.bringObjectToFront = vi.fn()
      this.sendObjectToBack = vi.fn()
      this.getZoom = vi.fn().mockReturnValue(1)
      this.zoomToPoint = vi.fn()
      this.viewportTransform = [1, 0, 0, 1, 0, 0]
      this.setViewportTransform = vi.fn()
      this.requestRenderAll = vi.fn()
      this.setDimensions = vi.fn()
      this.calcOffset = vi.fn()
      this.getScenePoint = vi.fn().mockReturnValue({ x: 10, y: 20 })
      this.on = vi.fn()
      this.off = vi.fn()
      this.fire = vi.fn()
      this.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,123')
      this.dispose = vi.fn()
    }
  }

  class MockFabricImage {
    constructor() {
      this.set = vi.fn()
    }
  }

  MockFabricImage.fromURL = vi.fn().mockResolvedValue(new MockFabricImage())

  class MockPencilBrush {}

  return {
    Canvas: MockCanvas,
    FabricImage: MockFabricImage,
    PencilBrush: MockPencilBrush,
    util: {
      enlivenObjects: vi.fn().mockResolvedValue([]),
      groupSVGElements: vi.fn().mockReturnValue({}),
    },
    loadSVGFromURL: vi.fn().mockResolvedValue({ objects: [], options: {} }),
  }
})

describe('FabricAdapter', () => {
  let adapter

  beforeEach(() => {
    adapter = new FabricAdapter()
    const canvasEl = document.createElement('canvas')
    adapter.init(canvasEl)
  })

  it('debería inicializar el lienzo de Fabric', () => {
    expect(adapter.canvas).toBeDefined()
  })

  it('debería agregar un objeto', () => {
    const obj = {}
    adapter.addObject(obj)
    expect(adapter.canvas.add).toHaveBeenCalledWith(obj)
  })

  it('debería remover un objeto', () => {
    const obj = {}
    adapter.removeObject(obj)
    expect(adapter.canvas.remove).toHaveBeenCalledWith(obj)
  })

  it('debería manejar el zoom', () => {
    adapter.zoomToPoint({ x: 0, y: 0 }, 2)
    expect(adapter.canvas.zoomToPoint).toHaveBeenCalledWith({ x: 0, y: 0 }, 2)
    expect(adapter.getZoom()).toBe(1)
  })
})
