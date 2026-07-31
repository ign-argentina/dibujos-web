import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExportService } from '../ExportService.js'

describe('ExportService', () => {
  let mockCanvas
  let mockCanvasManager

  beforeEach(() => {
    mockCanvas = {
      width: 800,
      height: 600,
      setViewportTransform: vi.fn(),
      getObjects: vi.fn().mockReturnValue([
        {
          isMapBase: true,
          left: 10,
          top: 10,
          width: 500,
          height: 400,
          scaleX: 1,
          scaleY: 1,
        },
      ]),
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mocked-data'),
      dispose: vi.fn(),
    }

    mockCanvasManager = {
      canvas: {
        clone: vi.fn().mockResolvedValue(mockCanvas),
      },
      currentMapImage: {
        left: 10,
        top: 10,
        width: 500,
        height: 400,
        scaleX: 1,
        scaleY: 1,
      },
      adapter: {
        discardActiveObject: vi.fn(),
        requestRenderAll: vi.fn(),
      },
    }
  })

  it('debería retornar el data URL offscreen sin parpadeos', async () => {
    const dataUrl = await ExportService.getExportDataURL(mockCanvasManager, {
      format: 'png',
      quality: 0.95,
    })

    expect(mockCanvasManager.adapter.discardActiveObject).toHaveBeenCalled()
    expect(mockCanvasManager.adapter.requestRenderAll).toHaveBeenCalled()
    expect(mockCanvasManager.canvas.clone).toHaveBeenCalled()
    expect(mockCanvas.setViewportTransform).toHaveBeenCalledWith([1, 0, 0, 1, 0, 0])
    expect(mockCanvas.toDataURL).toHaveBeenCalled()
    expect(mockCanvas.dispose).toHaveBeenCalled()
    expect(dataUrl).toBe('data:image/png;base64,mocked-data')
  })
})
