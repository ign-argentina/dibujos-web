import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ArrowTool } from '../ArrowTool.js'

vi.mock('fabric', () => {
  return {
    Path: class {
      constructor(path, opts) {
        this.path = path
        Object.assign(this, opts)
        this.type = 'path'
      }
      set(opts) {
        Object.assign(this, opts)
      }
      setCoords() {}
      _calcDimensions() {
        return { width: 100, height: 100, left: 0, top: 0 }
      }
    },
    util: {
      parsePath: vi.fn(p => p)
    }
  }
})

describe('ArrowTool', () => {
  let mockCanvasManager
  let tool

  beforeEach(() => {
    mockCanvasManager = {
      activeColor: '#FFF4B0',
      activeStrokeWidth: 8,
      activeTool: 'arrow',
      onToolChange: vi.fn(),
      setTool: vi.fn(),
      finishCreatedObject: vi.fn(),
      createArrowPath: vi.fn((x1, y1, x2, y2) => `M ${x1} ${y1} L ${x2} ${y2}`),
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

    tool = new ArrowTool(mockCanvasManager)
  })

  it('debería inicializar correctamente al activarse', () => {
    tool.onActivate()
    expect(mockCanvasManager.adapter.setDrawingMode).toHaveBeenCalledWith(false)
    expect(mockCanvasManager.adapter.setSelectionEnabled).toHaveBeenCalledWith(false)
    expect(mockCanvasManager.adapter.setDefaultCursor).toHaveBeenCalledWith('crosshair')
  })

  it('debería crear el preview en mouseDown y actualizarlo en mouseMove', () => {
    tool.onActivate()
    
    // Simular mouseDown
    tool.onMouseDown({ e: { clientX: 10, clientY: 20 } })
    expect(tool.previewShape).not.toBeNull()
    expect(mockCanvasManager.adapter.addObject).toHaveBeenCalledWith(tool.previewShape)
    
    const initialPreview = tool.previewShape

    // Simular mouseMove
    tool.onMouseMove({ e: { clientX: 30, clientY: 40 } })
    expect(tool.previewShape).toBe(initialPreview) // Reutiliza el mismo objeto!
    expect(tool.previewShape.path).toBe('M 10 20 L 30 40')
  })

  it('debería finalizar el dibujo en mouseUp', () => {
    tool.onActivate()
    tool.onMouseDown({ e: { clientX: 10, clientY: 20 } })
    tool.onMouseMove({ e: { clientX: 100, clientY: 200 } })
    
    const finalPreview = tool.previewShape
    tool.onMouseUp({ e: { clientX: 100, clientY: 200 } })

    expect(mockCanvasManager.finishCreatedObject).toHaveBeenCalledWith(finalPreview, 'arrow')
    expect(tool.previewShape).toBeNull()
  })

  it('debería finalizar con flecha por defecto si el arrastre es muy corto', () => {
    tool.onActivate()
    tool.onMouseDown({ e: { clientX: 10, clientY: 20 } })
    
    const initialPreview = tool.previewShape
    tool.onMouseUp({ e: { clientX: 12, clientY: 22 } }) // Distancia = 2.82px < 5px

    expect(mockCanvasManager.adapter.removeObject).toHaveBeenCalledWith(initialPreview)
    expect(mockCanvasManager.finishCreatedObject).toHaveBeenCalled()
    expect(mockCanvasManager.finishCreatedObject.mock.calls[0][0]).not.toBe(initialPreview)
    expect(tool.previewShape).toBeNull()
  })
})
