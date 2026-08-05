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
        setDefaultCursor: vi.fn(),
      },
    }
  })

  it('debería registrar y alternar herramientas correctamente', () => {
    const service = new ToolService(mockCanvasManager)

    // Configurar pincel
    service.setTool('brush')
    expect(mockCanvasManager.adapter.setDrawingMode).toHaveBeenCalledWith(true)

    // Configurar rectángulo
    service.setTool('rect')
    expect(mockCanvasManager.adapter.setDrawingMode).toHaveBeenLastCalledWith(false)
    expect(mockCanvasManager.adapter.setDefaultCursor).toHaveBeenLastCalledWith('crosshair')
  })
})
