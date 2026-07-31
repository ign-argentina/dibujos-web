import { jsPDF } from 'jspdf'

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

    // Clonar el canvas lógicamente para procesarlo de forma aislada
    const clonedCanvas = await canvasManager.canvas.clone()

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
  static async exportToPNG(canvasManager, fileName = 'mapa_anotado.png') {
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
   * Exporta el canvas a un documento PDF descargable utilizando jsPDF.
   * @param {CanvasManager} canvasManager
   * @param {Object} options - orientation, width, height, fileName, marginPct.
   * @returns {Promise<void>}
   */
  static async exportToPDF(canvasManager, options = {}) {
    const {
      fileName = 'mapa.pdf',
      orientation = 'portrait',
      width = 210,
      height = 297,
      marginPct = 5,
    } = options

    try {
      const dataUrl = await this.getExportDataURL(canvasManager, {
        format: 'png',
        quality: 1.0,
        targetWidth: 1600,
      })

      const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: [width, height],
      })

      const margin = (width * marginPct) / 100
      const contentWidth = width - margin * 2
      const contentHeight = height - margin * 2

      doc.addImage(dataUrl, 'PNG', margin, margin, contentWidth, contentHeight)
      doc.save(fileName)
    } catch (error) {
      console.error('ExportService: Error al exportar a PDF:', error)
    }
  }

  /**
   * Abre la ventana de impresión física del navegador.
   * @param {CanvasManager} canvasManager
   * @param {Object} options
   * @returns {Promise<void>}
   */
  static async print(canvasManager, options = {}) {
    const { orientation = 'portrait' } = options

    try {
      const dataUrl = await this.getExportDataURL(canvasManager, {
        format: 'png',
        quality: 1.0,
        targetWidth: 1200,
      })

      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Imprimir Mapa</title>
              <style>
                @page {
                  size: ${orientation === 'portrait' ? 'portrait' : 'landscape'};
                  margin: 0;
                }
                body {
                  margin: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  background-color: white;
                }
                img {
                  max-width: 90%;
                  max-height: 90%;
                  object-fit: contain;
                }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" onload="window.print(); window.close();" />
            </body>
          </html>
        `)
        printWindow.document.close()
      }
    } catch (error) {
      console.error('ExportService: Error al imprimir:', error)
    }
  }
}
