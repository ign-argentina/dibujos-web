import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CanvasManager } from '../../canvasManager.js'

// Mock de Fabric
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
      this.setViewportTransform = vi.fn((vpt) => {
        this.viewportTransform = vpt
      })
      this.requestRenderAll = vi.fn()
      this.setDimensions = vi.fn()
      this.calcOffset = vi.fn()
      this.getScenePoint = vi.fn().mockReturnValue({ x: 100, y: 150 })
      this.setCursor = vi.fn()
      this.on = vi.fn()
      this.off = vi.fn()
      this.fire = vi.fn()
      this.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mock')
      this.dispose = vi.fn()
    }
  }

  class MockFabricImage {
    constructor() {
      this.width = 2000
      this.height = 2500
      this.left = 0
      this.top = 0
      this.scaleX = 1
      this.scaleY = 1
      this.set = vi.fn((props) => {
        Object.assign(this, props)
      })
    }
  }

  MockFabricImage.fromURL = vi.fn().mockResolvedValue(new MockFabricImage())

  class MockFabricObject {}
  MockFabricObject.ownDefaults = {}

  class MockPencilBrush {}

  return {
    Canvas: MockCanvas,
    FabricImage: MockFabricImage,
    PencilBrush: MockPencilBrush,
    FabricObject: MockFabricObject,
    Rect: class {
      constructor(opts) {
        Object.assign(this, opts)
      }
    },
    Circle: class {
      constructor(opts) {
        Object.assign(this, opts)
      }
    },
    Textbox: class {
      constructor(text, opts) {
        this.text = text
        Object.assign(this, opts)
      }
    },
    Path: class {
      constructor(path, opts) {
        this.path = path
        Object.assign(this, opts)
      }
    },
    Polyline: class {
      constructor(pts, opts) {
        this.points = pts
        Object.assign(this, opts)
      }
    },
    Polygon: class {
      constructor(pts, opts) {
        this.points = pts
        Object.assign(this, opts)
      }
    },
    util: {
      enlivenObjects: vi.fn().mockResolvedValue([]),
      groupSVGElements: vi.fn().mockReturnValue({}),
      parsePath: vi.fn().mockReturnValue([]),
    },
    loadSVGFromURL: vi.fn().mockResolvedValue({ objects: [], options: {} }),
  }
})

describe('CanvasManager - Sistema Canónico y Resize', () => {
  let container
  let manager

  beforeEach(() => {
    container = document.createElement('div')
    container.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 1000,
      height: 800,
      top: 0,
      left: 0,
      right: 1000,
      bottom: 800,
    })
    manager = new CanvasManager(container)
    manager.init()
  })

  it('debería inicializar el mapa con coordenadas canónicas (0,0) y escala 1', async () => {
    await manager.loadMap('/maps/test-map.png')

    expect(manager.currentMapImage).toBeDefined()
    expect(manager.currentMapImage.left).toBe(0)
    expect(manager.currentMapImage.top).toBe(0)
    expect(manager.currentMapImage.scaleX).toBe(1)
    expect(manager.currentMapImage.scaleY).toBe(1)
  })

  it('debería ajustar el viewportTransform al hacer fitMapToCanvas sin mover la imagen base', async () => {
    await manager.loadMap('/maps/test-map.png')

    // Contenedor 1000 x 800, Mapa 2000 x 2500
    // scaleX = (1000 * 0.9) / 2000 = 0.45
    // scaleY = (800 * 0.9) / 2500 = 0.288
    // scale = min(0.45, 0.288) = 0.288
    // xOffset = (1000 - 2000 * 0.288) / 2 = (1000 - 576) / 2 = 212
    // yOffset = (800 - 2500 * 0.288) / 2 = (800 - 720) / 2 = 40
    manager.fitMapToCanvas()

    const vpt = manager.adapter.getViewportTransform()
    expect(vpt[0]).toBeCloseTo(0.288, 3)
    expect(vpt[3]).toBeCloseTo(0.288, 3)
    expect(vpt[4]).toBeCloseTo(212, 1)
    expect(vpt[5]).toBeCloseTo(40, 1)

    // El objeto mapa base permanece en (0,0) con escala 1
    expect(manager.currentMapImage.left).toBe(0)
    expect(manager.currentMapImage.top).toBe(0)
    expect(manager.currentMapImage.scaleX).toBe(1)
    expect(manager.currentMapImage.scaleY).toBe(1)
  })

  it('debería preservar intactas las coordenadas canónicas de los objetos al redimensionar la pantalla', async () => {
    await manager.loadMap('/maps/test-map.png')

    // Simular un dibujo de usuario en coordenadas canónicas sobre el mapa (ej. punto de interés)
    const userDrawing = {
      left: 1250,
      top: 1800,
      scaleX: 1,
      scaleY: 1,
      width: 100,
      height: 100,
    }

    manager.adapter.addObject(userDrawing)

    // Cambiar el tamaño del contenedor (ej. resize a 500x600)
    container.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 500,
      height: 600,
      top: 0,
      left: 0,
      right: 500,
      bottom: 600,
    })

    manager.resizeCanvas()

    // Las coordenadas canónicas del dibujo NO deben cambiar
    expect(userDrawing.left).toBe(1250)
    expect(userDrawing.top).toBe(1800)
    expect(userDrawing.scaleX).toBe(1)
    expect(userDrawing.scaleY).toBe(1)

    // El mapa base tampoco cambia de posición interna
    expect(manager.currentMapImage.left).toBe(0)
    expect(manager.currentMapImage.top).toBe(0)
    expect(manager.currentMapImage.scaleX).toBe(1)
  })
})
