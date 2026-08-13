import { jsPDF } from 'jspdf'
import { appStore } from '../../state/AppStore.js'
import { configRepository } from '../repositories/ConfigRepository.js'
import { mapRepository } from '../repositories/MapRepository.js'

/**
 * Servicio encargado de la exportación de documentos (PNG, PDF) y de la impresión física.
 * Procesa la renderización en memoria (offscreen/clonación) para eliminar el parpadeo en pantalla.
 */
export class ExportService {
  /**
   * Obtiene la representación Data URL de forma offscreen para evitar parpadeos visuales.
   * @param {CanvasManager} canvasManager
   * @param {Object} options - Formato, calidad, dimensiones, etc.
   * @returns {Promise<string>}
   */
  static async getExportDataURL(canvasManager, options = {}) {
    if (!canvasManager || !canvasManager.canvas || !canvasManager.currentMapImage) return ''

    const { format = 'png', quality = 1.0, targetWidth } = options

    // Deseleccionar objetos activos en el canvas principal para no exportar controles visuales
    canvasManager.adapter.discardActiveObject()
    canvasManager.adapter.requestRenderAll()

    // Clonar el canvas lógicamente para procesarlo de forma aislada, asegurando incluir propiedades personalizadas
    const clonedCanvas = await canvasManager.canvas.clone(['isMapBase'])

    // Configurar fondo blanco sólido para el canvas clonado para evitar costados negros en conversiones JPG
    clonedCanvas.backgroundColor = '#ffffff'

    // Resetear transformaciones de zoom y paneo en el canvas clonado
    clonedCanvas.setViewportTransform([1, 0, 0, 1, 0, 0])

    // Localizar el mapa base clonado
    const clonedMapImage = clonedCanvas
      .getObjects()
      .find((obj) => obj.isMapBase === true || (obj.type === 'image' && obj.selectable === false))

    let left = 0
    let top = 0
    let width = clonedCanvas.width
    let height = clonedCanvas.height

    if (clonedMapImage) {
      left = clonedMapImage.left
      top = clonedMapImage.top
      width = clonedMapImage.width * clonedMapImage.scaleX
      height = clonedMapImage.height * clonedMapImage.scaleY
    }

    // Calcular escala del multiplicador según la resolución objetivo
    let multiplier = 1
    if (targetWidth && width > 0) {
      multiplier = targetWidth / width
    } else if (options.multiplier) {
      multiplier = options.multiplier
    }

    // Generar la representación base64
    const dataUrl = clonedCanvas.toDataURL({
      format: format === 'jpg' ? 'jpeg' : format,
      quality: Math.min(Math.max(quality, 0.1), 1.0),
      multiplier: multiplier,
      left,
      top,
      width,
      height,
    })

    // Liberar los recursos de memoria del clon
    clonedCanvas.dispose()

    return dataUrl
  }

  /**
   * Exporta el canvas actual a una imagen PNG física descargable.
   * @param {CanvasManager} canvasManager
   * @param {string} fileName
   * @returns {Promise<void>}
   */
  static async exportToPNG(canvasManager, fileName = 'mapas_escolares_IGN_.png') {
    try {
      const dataUrl = await this.getExportDataURL(canvasManager, {
        format: 'png',
        quality: 1.0,
        multiplier: 2,
      })

      const link = document.createElement('a')
      link.download = fileName
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('ExportService: Error al exportar a PNG:', error)
    }
  }

  /**
   * Exporta el canvas actual a una imagen descargable (PNG o JPG).
   * @param {CanvasManager} canvasManager
   * @param {Object} options - format, scale, quality.
   * @returns {Promise<void>}
   */
  static async exportToImage(canvasManager, options = {}) {
    const {
      format = 'png',
      scale = 100,
      quality = 2,
    } = options

    try {
      const currentMapId = appStore.getState().activeMapId
      const mapData = await mapRepository.getById(currentMapId)
      const isPortrait = mapData ? mapData.isPortrait : true

      const mapWidthMm = isPortrait ? 190 : 240
      const mapHeightMm = isPortrait ? 240 : 190

      const DPI = quality === 1 ? 72 : quality === 3 ? 300 : 150
      const mmToInches = 1 / 25.4
      const targetWidthPx = Math.round(mapWidthMm * mmToInches * DPI * (scale / 100))
      const targetHeightPx = Math.round(mapHeightMm * mmToInches * DPI * (scale / 100))

      const dataUrl = await this.getExportDataURL(canvasManager, {
        format: format,
        quality: 0.95,
        targetWidth: targetWidthPx,
        targetHeight: targetHeightPx,
      })

      const prefix = configRepository.getExportFilenamePrefix()
      const mapName = mapData ? mapData.name.replace(/\s+/g, '_') : 'mapa'
      const fileName = `${prefix}${mapName}.${format}`

      const link = document.createElement('a')
      link.download = fileName
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('ExportService: Error al exportar a imagen:', error)
    }
  }

  /**
   * Exporta el canvas a un documento PDF descargable utilizando jsPDF.
   * @param {CanvasManager} canvasManager
   * @param {Object} options - orientation, paperWidth, paperHeight, scale, quality.
   * @returns {Promise<void>}
   */
  static async exportToPDF(canvasManager, options = {}) {
    const {
      paperWidth = 210,
      paperHeight = 297,
      orientation = 'portrait',
      scale = 100,
      quality = 2,
    } = options

    try {
      const currentMapId = appStore.getState().activeMapId
      const mapData = await mapRepository.getById(currentMapId)
      const isPortrait = mapData ? mapData.isPortrait : true

      const mapWidthMm = isPortrait ? 190 : 240
      const mapHeightMm = isPortrait ? 240 : 190

      const DPI = quality === 1 ? 72 : quality === 3 ? 300 : 150
      const mmToInches = 1 / 25.4
      const targetWidthPx = Math.round(mapWidthMm * mmToInches * DPI)
      const targetHeightPx = Math.round(mapHeightMm * mmToInches * DPI)

      const dataUrl = await this.getExportDataURL(canvasManager, {
        format: 'png',
        quality: 1.0,
        targetWidth: targetWidthPx,
        targetHeight: targetHeightPx,
      })

      const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: [paperWidth, paperHeight],
      })

      const scaleFactor = scale / 100
      const finalW = mapWidthMm * scaleFactor
      const finalH = mapHeightMm * scaleFactor

      const offsetX = (paperWidth - finalW) / 2
      const offsetY = (paperHeight - finalH) / 2

      doc.addImage(dataUrl, 'PNG', offsetX, offsetY, finalW, finalH)
      
      const prefix = configRepository.getExportFilenamePrefix()
      const mapName = mapData ? mapData.name.replace(/\s+/g, '_') : 'mapa'
      const fileName = `${prefix}${mapName}.pdf`
      
      doc.save(fileName)
    } catch (error) {
      console.error('ExportService: Error al exportar a PDF:', error)
    }
  }

  /**
   * Abre la ventana de impresión física del navegador.
   * @param {CanvasManager} canvasManager
   * @param {Object} options - paperWidth, paperHeight, orientation, scale, quality.
   * @returns {Promise<void>}
   */
  static async print(canvasManager, options = {}) {
    const {
      paperWidth = 210,
      paperHeight = 297,
      scale = 100,
    } = options

    try {
      const currentMapId = appStore.getState().activeMapId
      const mapData = await mapRepository.getById(currentMapId)
      const isPortrait = mapData ? mapData.isPortrait : true

      const mapWidthMm = isPortrait ? 190 : 240
      const mapHeightMm = isPortrait ? 240 : 190

      const DPI = 150
      const mmToInches = 1 / 25.4
      const targetWidthPx = Math.round(mapWidthMm * mmToInches * DPI)
      const targetHeightPx = Math.round(mapHeightMm * mmToInches * DPI)

      const dataUrl = await this.getExportDataURL(canvasManager, {
        format: 'png',
        quality: 1.0,
        targetWidth: targetWidthPx,
        targetHeight: targetHeightPx,
      })

      const scaleFactor = scale / 100
      const finalW = mapWidthMm * scaleFactor
      const finalH = mapHeightMm * scaleFactor

      const offsetX = (paperWidth - finalW) / 2
      const offsetY = (paperHeight - finalH) / 2

      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.top = '-9999px'
      iframe.style.left = '-9999px'
      iframe.style.width = '1px'
      iframe.style.height = '1px'
      iframe.style.border = 'none'

      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentWindow.document
      iframeDoc.open()
      iframeDoc.write(`
        <html>
          <head>
            <title>Imprimir Mapa</title>
            <style>
              @page {
                size: ${paperWidth}mm ${paperHeight}mm;
                margin: 0;
              }
              body {
                margin: 0;
                background-color: white;
              }
            </style>
          </head>
          <body>
            <div style="width: ${paperWidth}mm; height: ${paperHeight}mm; position: relative; overflow: hidden;">
              <img src="${dataUrl}" style="position: absolute; left: ${offsetX}mm; top: ${offsetY}mm; width: ${finalW}mm; height: ${finalH}mm; object-fit: contain;" alt="Mapa impreso" />
            </div>
          </body>
        </html>
      `)
      iframeDoc.close()

      const img = iframeDoc.querySelector('img')

      const executePrint = () => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      }

      const cleanup = () => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe)
        }
      }

      iframe.contentWindow.onafterprint = () => {
        setTimeout(cleanup, 1000)
      }

      img.onerror = () => {
        cleanup()
      }

      if (img.complete) {
        executePrint()
      } else {
        img.onload = executePrint
      }
    } catch (error) {
      console.error('ExportService: Error al imprimir:', error)
    }
  }
}
