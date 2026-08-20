import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToolService } from '../ToolService.js'

describe('ToolService', () => {
  let mockCanvasManager

  beforeEach(() => {
    mockCanvasManager = {
      activeColor: '#FFF4B0',
      activeStrokeWidth: 8,
      activeTool: 'select',
      configureDrawingBrush: vi.fn(),
      adapter: {
        setDrawingMode: vi.fn(),
        setSelectionEnabled: vi.fn(),
        setSkipTargetFind: vi.fn(),
        setDefaultCursor: vi.fn(),
        discardActiveObject: vi.fn(),
        requestRenderAll: vi.fn(),
        getActiveObject: vi.fn(),
        getObjects: vi.fn().mockReturnValue([]),
      },
    }
  })

  it('debería registrar y alternar herramientas aplicando la política central', () => {
    const service = new ToolService(mockCanvasManager)

    // Configurar pincel
    service.setTool('brush')
    expect(mockCanvasManager.adapter.setDrawingMode).toHaveBeenCalledWith(true)
    expect(mockCanvasManager.adapter.setSelectionEnabled).toHaveBeenCalledWith(false)
    expect(mockCanvasManager.adapter.setSkipTargetFind).toHaveBeenCalledWith(true)
    expect(mockCanvasManager.adapter.setDefaultCursor).toHaveBeenCalledWith('default')

    // Configurar rectángulo
    service.setTool('rect')
    expect(mockCanvasManager.adapter.setDrawingMode).toHaveBeenLastCalledWith(false)
    expect(mockCanvasManager.adapter.setSelectionEnabled).toHaveBeenLastCalledWith(false)
    expect(mockCanvasManager.adapter.setSkipTargetFind).toHaveBeenLastCalledWith(true)
    expect(mockCanvasManager.adapter.setDefaultCursor).toHaveBeenLastCalledWith('crosshair')
    expect(mockCanvasManager.adapter.discardActiveObject).toHaveBeenCalled()

    // Configurar selección
    service.setTool('select')
    expect(mockCanvasManager.adapter.setSelectionEnabled).toHaveBeenLastCalledWith(true)
    expect(mockCanvasManager.adapter.setSkipTargetFind).toHaveBeenLastCalledWith(false)
    expect(mockCanvasManager.adapter.setDefaultCursor).toHaveBeenLastCalledWith('default')

    // Configurar pan
    service.setTool('pan')
    expect(mockCanvasManager.adapter.setSelectionEnabled).toHaveBeenLastCalledWith(false)
    expect(mockCanvasManager.adapter.setSkipTargetFind).toHaveBeenLastCalledWith(true)
    expect(mockCanvasManager.adapter.setDefaultCursor).toHaveBeenLastCalledWith('grab')
  })

  it('debería preservar selección si se re-selecciona la herramienta select', () => {
    const service = new ToolService(mockCanvasManager)
    service.setTool('select')
    mockCanvasManager.adapter.discardActiveObject.mockClear()

    // Re-seleccionar select
    service.setTool('select')
    expect(mockCanvasManager.adapter.discardActiveObject).not.toHaveBeenCalled()
  })

  it('debería salir del modo edición de texto al cambiar de herramienta', () => {
    const exitEditingSpy = vi.fn()
    mockCanvasManager.adapter.getActiveObject.mockReturnValue({
      isEditing: true,
      exitEditing: exitEditingSpy,
    })

    const service = new ToolService(mockCanvasManager)
    service.setTool('rect')

    expect(exitEditingSpy).toHaveBeenCalled()
    expect(mockCanvasManager.adapter.discardActiveObject).toHaveBeenCalled()
  })
})
