import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PolygonTool } from '../PolygonTool.js'

// Simular el módulo fabric y ShapeFactory
vi.mock('fabric', () => {
  return {
    Polygon: class {
      constructor(points, opts) {
        this.points = points
        Object.assign(this, opts)
        this.type = 'polygon'
      }
    }
  }
})

describe('PolygonTool', () => {
  let mockCanvasManager
  let tool

  beforeEach(() => {
    mockCanvasManager = {
      activeColor: '#FFF4B0',
      activeStrokeWidth: 8,
      activeTool: 'polygon',
      onToolChange: vi.fn(),
      setTool: vi.fn(),
      finishCreatedObject: vi.fn(),
      adapter: {
        setDrawingMode: vi.fn(),
        setSelectionEnabled: vi.fn(),
        setDefaultCursor: vi.fn(),
        getScenePoint: vi.fn((e) => ({ x: e.clientX, y: e.clientY })),
        addObject: vi.fn(),
        removeObject: vi.fn(),
        requestRenderAll: vi.fn(),
      },
    }

    tool = new PolygonTool(mockCanvasManager)
  })

  it('debería inicializar correctamente al activarse', () => {
    tool.onActivate()
    expect(tool.points).toEqual([])
    expect(tool.previewShape).toBeNull()
  })

  it('debería agregar puntos y actualizar vista previa en mouseDown y mouseMove', () => {
    tool.onActivate()
    
    // Simular primer click
    tool.onMouseDown({ e: { clientX: 10, clientY: 20 } })
    expect(tool.points).toEqual([{ x: 10, y: 20 }])
    expect(tool.previewShape).toBeNull() // Necesita al menos 2 puntos para la preview

    // Simular movimiento antes de hacer click
    tool.onMouseMove({ e: { clientX: 30, clientY: 40 } })
    expect(tool.previewShape).not.toBeNull()
    expect(mockCanvasManager.adapter.addObject).toHaveBeenCalled()

    // Simular segundo click
    tool.onMouseDown({ e: { clientX: 50, clientY: 60 } })
    expect(tool.points).toEqual([{ x: 10, y: 20 }, { x: 50, y: 60 }])
  })

  it('debería finalizar el dibujo al hacer click cerca del primer vértice', () => {
    tool.onActivate()
    tool.onMouseDown({ e: { clientX: 10, clientY: 20 } })
    tool.onMouseDown({ e: { clientX: 50, clientY: 20 } })
    tool.onMouseDown({ e: { clientX: 50, clientY: 60 } })
    
    // Tercer click de verdad colocado
    expect(tool.points.length).toBe(3)

    // Clic cerca del primer punto (x: 10, y: 20) -> p.ej. (x: 12, y: 22)
    tool.onMouseDown({ e: { clientX: 12, clientY: 22 } })

    expect(mockCanvasManager.finishCreatedObject).toHaveBeenCalled()
    expect(mockCanvasManager.finishCreatedObject.mock.calls[0][0].type).toBe('polygon')
    // El punto de cerrado no se añade como nuevo vértice
    expect(mockCanvasManager.finishCreatedObject.mock.calls[0][0].points.length).toBe(3)
  })

  it('debería finalizar dibujo con doble click y limpiar duplicados', () => {
    vi.useFakeTimers()
    tool.onActivate()
    vi.advanceTimersByTime(500)
    tool.onMouseDown({ e: { clientX: 10, clientY: 20 } })
    tool.onMouseDown({ e: { clientX: 50, clientY: 20 } })
    tool.onMouseDown({ e: { clientX: 50, clientY: 60 } })
    // Double click añade un punto y luego dispara onMouseDblClick
    tool.onMouseDown({ e: { clientX: 50, clientY: 60 } })
    
    tool.onMouseDblClick({})
    
    expect(mockCanvasManager.finishCreatedObject).toHaveBeenCalled()
    expect(mockCanvasManager.finishCreatedObject.mock.calls[0][0].type).toBe('polygon')
    expect(mockCanvasManager.finishCreatedObject.mock.calls[0][0].points.length).toBe(3)
    vi.useRealTimers()
  })

  it('debería finalizar dibujo al presionar Enter', () => {
    tool.onActivate()
    tool.onMouseDown({ e: { clientX: 10, clientY: 20 } })
    tool.onMouseDown({ e: { clientX: 50, clientY: 20 } })
    tool.onMouseDown({ e: { clientX: 50, clientY: 60 } })

    const handled = tool.onKeyDown({ key: 'Enter' })
    expect(handled).toBe(true)
    expect(mockCanvasManager.finishCreatedObject).toHaveBeenCalled()
  })

  it('debería cancelar dibujo y resetear a pan al presionar Escape', () => {
    tool.onActivate()
    tool.onMouseDown({ e: { clientX: 10, clientY: 20 } })
    tool.onMouseMove({ e: { clientX: 30, clientY: 40 } })

    const handled = tool.onKeyDown({ key: 'Escape' })
    expect(handled).toBe(true)
    expect(mockCanvasManager.setTool).toHaveBeenCalledWith('pan')
    expect(mockCanvasManager.onToolChange).toHaveBeenCalledWith('pan')
    expect(tool.points).toEqual([])
    expect(tool.previewShape).toBeNull()
  })
})
