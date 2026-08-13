import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExportService } from '../ExportService.js'

// Mock de AppStore
vi.mock('../../../state/AppStore.js', () => ({
  appStore: {
    getState: () => ({ activeMapId: 'mapa-1' }),
  },
}))

// Mock de MapRepository
vi.mock('../../repositories/MapRepository.js', () => ({
  mapRepository: {
    getById: vi.fn().mockResolvedValue({ isPortrait: true, name: 'Mapa de Salta' }),
  },
}))

// Mock de ConfigRepository
vi.mock('../../repositories/ConfigRepository.js', () => ({
  configRepository: {
    getExportFilenamePrefix: () => 'IGN_Escolar_',
  },
}))

// Mock de jsPDF
const saveMock = vi.fn()
const addImageMock = vi.fn()
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(function() {
    this.save = saveMock
    this.addImage = addImageMock
  }),
}))

describe('ExportService', () => {
  let mockCanvas
  let mockCanvasManager

  beforeEach(() => {
    vi.clearAllMocks()

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

  it('debería ejecutar exportToImage y descargar la imagen con el prefijo correcto', async () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const removeSpy = vi.spyOn(document.body, 'removeChild')

    await ExportService.exportToImage(mockCanvasManager, {
      format: 'png',
      scale: 100,
      quality: 2,
    })

    expect(appendSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalled()

    const link = appendSpy.mock.calls[0][0]
    expect(link.download).toBe('IGN_Escolar_Mapa_de_Salta.png')
    expect(link.href).toBe('data:image/png;base64,mocked-data')
  })

  it('debería ejecutar exportToPDF, agregar la imagen escalada y guardar el PDF', async () => {
    await ExportService.exportToPDF(mockCanvasManager, {
      paperWidth: 210,
      paperHeight: 297,
      orientation: 'portrait',
      scale: 100,
      quality: 2,
    })

    expect(addImageMock).toHaveBeenCalledWith('data:image/png;base64,mocked-data', 'PNG', expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number))
    expect(saveMock).toHaveBeenCalledWith('IGN_Escolar_Mapa_de_Salta.pdf')
  })

  it('debería ejecutar print creando un iframe invisible, escribiendo el documento y llamando a print', async () => {
    const mockIframe = {
      style: {},
      contentWindow: {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
          querySelector: vi.fn().mockReturnValue({
            complete: true,
          }),
        },
        focus: vi.fn(),
        print: vi.fn(),
        onafterprint: null,
      },
    }

    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockIframe)
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})

    await ExportService.print(mockCanvasManager, {
      paperWidth: 210,
      paperHeight: 297,
      scale: 100,
    })

    expect(createElementSpy).toHaveBeenCalledWith('iframe')
    expect(mockIframe.style.position).toBe('fixed')
    expect(mockIframe.style.top).toBe('-9999px')
    expect(mockIframe.contentWindow.document.write).toHaveBeenCalled()
    expect(mockIframe.contentWindow.print).toHaveBeenCalled()

    // Simular el evento onafterprint para el cleanup
    expect(mockIframe.contentWindow.onafterprint).toBeTypeOf('function')
    
    // Configurar parentNode mock para simular la existencia del iframe en el DOM
    mockIframe.parentNode = document.body
    
    // Ejecutar cleanup y avanzar timers
    vi.useFakeTimers()
    mockIframe.contentWindow.onafterprint()
    vi.advanceTimersByTime(1000)
    expect(removeSpy).toHaveBeenCalledWith(mockIframe)
    vi.useRealTimers()
  })

  it('debería ejecutar print y esperar a onload si la imagen no está cargada (complete = false)', async () => {
    const mockImg = {
      complete: false,
      onload: null,
    }
    const mockIframe = {
      style: {},
      contentWindow: {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
          querySelector: vi.fn().mockReturnValue(mockImg),
        },
        focus: vi.fn(),
        print: vi.fn(),
      },
    }

    vi.spyOn(document, 'createElement').mockReturnValue(mockIframe)
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})

    await ExportService.print(mockCanvasManager, {
      paperWidth: 210,
      paperHeight: 297,
      scale: 100,
    })

    expect(mockIframe.contentWindow.print).not.toHaveBeenCalled()
    expect(mockImg.onload).toBeTypeOf('function')

    // Disparar la carga de la imagen
    mockImg.onload()
    expect(mockIframe.contentWindow.print).toHaveBeenCalled()
  })
})
