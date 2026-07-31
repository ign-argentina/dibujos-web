import { jsPDF } from 'jspdf'
import { Component } from '../Component.js'
import { appStore } from '../../state/AppStore.js'
import { ExportService } from '../../core/export/ExportService.js'

/**
 * Componente que gestiona el cuadro de diálogo de exportación de mapas (Formatos, Calidad, Previsualización, PDF e Impresión).
 * Hereda de Component para el desacoplamiento y ciclo de vida limpio.
 */
export class ExportModal extends Component {
  constructor(canvasManager, mapRepository) {
    const modalEl = document.getElementById('export-modal')
    if (!modalEl) {
      throw new Error('No se encontró el elemento #export-modal')
    }
    super(modalEl)

    if (!canvasManager) {
      throw new TypeError('ExportModal requiere una instancia de CanvasManager')
    }
    if (!mapRepository) {
      throw new TypeError('ExportModal requiere una instancia de MapRepository')
    }

    this.canvasManager = canvasManager
    this.mapRepository = mapRepository

    // Opciones iniciales de exportación
    this.destination = 'save' // 'save' | 'print'
    this.format = 'pdf' // 'png' | 'jpg' | 'pdf'
    this.paperSizeKey = 'A4'
    this.orientation = 'portrait' // 'portrait' | 'landscape'
    this.scale = 100
    this.margin = 0
    this.quality = 2 // Multiplicador de calidad DPI

    // Diccionario de dimensiones físicas del papel (en mm)
    this.paperSizes = {
      A4: { width: 210, height: 297 },
      Oficio: { width: 215.9, height: 355.6 },
    }

    this.mount()
  }

  render() {
    this.closeBtn = document.getElementById('export-modal-close')
    this.cancelBtn = document.getElementById('exp-btn-cancel')
    this.submitBtn = document.getElementById('exp-btn-submit')
  }

  bindEvents() {
    // Abrir/Cerrar
    if (this.closeBtn) this.addEvent(this.closeBtn, 'click', () => this.close())
    if (this.cancelBtn) this.addEvent(this.cancelBtn, 'click', () => this.close())

    // Cerrar haciendo click en el fondo del backdrop
    this.addEvent(this.container, 'click', (e) => {
      if (e.target === this.container) this.close()
    })

    // Cerrar con tecla Escape
    this.addEvent(document, 'keydown', (e) => {
      if (!this.container.classList.contains('hidden') && e.key === 'Escape') {
        this.close()
      }
    })

    // Controles de Destino
    const destSaveBtn = document.getElementById('exp-dest-save')
    const destPrintBtn = document.getElementById('exp-dest-print')

    if (destSaveBtn) {
      this.addEvent(destSaveBtn, 'click', () => this.setDestination('save'))
    }
    if (destPrintBtn) {
      this.addEvent(destPrintBtn, 'click', () => this.setDestination('print'))
    }

    // Controles de Formato (PNG / JPG / PDF)
    ;['png', 'jpg', 'pdf'].forEach((fmt) => {
      const btn = document.getElementById(`exp-fmt-${fmt}`)
      if (btn) {
        this.addEvent(btn, 'click', () => this.setFormat(fmt))
      }
    })

    // Selector de tamaño de papel
    const paperSelect = document.getElementById('exp-paper-size')
    if (paperSelect) {
      this.addEvent(paperSelect, 'change', async (e) => {
        this.paperSizeKey = e.target.value
        await this.updatePreview()
      })
    }

    // Controles de Orientación (Vertical / Horizontal)
    const orientPortraitBtn = document.getElementById('exp-orient-portrait')
    const orientLandscapeBtn = document.getElementById('exp-orient-landscape')

    if (orientPortraitBtn) {
      this.addEvent(orientPortraitBtn, 'click', () => this.setOrientation('portrait'))
    }
    if (orientLandscapeBtn) {
      this.addEvent(orientLandscapeBtn, 'click', () => this.setOrientation('landscape'))
    }

    // Slider de Escala
    const scaleSlider = document.getElementById('exp-scale-slider')
    const scaleValText = document.getElementById('exp-scale-val')
    if (scaleSlider) {
      this.addEvent(scaleSlider, 'input', async (e) => {
        this.scale = parseInt(e.target.value, 10)
        if (scaleValText) scaleValText.textContent = `${this.scale}%`
        await this.updatePreview()
      })
    }

    // Restablecer Escala
    const preset100Btn = document.getElementById('exp-btn-preset-100')
    if (preset100Btn) {
      this.addEvent(preset100Btn, 'click', () => this.resetTo100Percent())
    }

    // Selector de Calidad
    const qualitySelect = document.getElementById('exp-quality-select')
    if (qualitySelect) {
      this.addEvent(qualitySelect, 'change', async (e) => {
        this.quality = parseInt(e.target.value, 10)
        await this.updatePreview()
      })
    }

    // Botón Aceptar / Generar
    if (this.submitBtn) {
      this.addEvent(this.submitBtn, 'click', () => this.executeAction())
    }
  }

  async open() {
    this.container.classList.remove('hidden')
    this.container.setAttribute('aria-hidden', 'false')

    // Sincronizar el estado de la hoja de acuerdo a la orientación nativa del mapa
    const currentMapId = appStore.getState().activeMapId
    const mapData = await this.mapRepository.getById(currentMapId)
    const isPortrait = mapData ? mapData.isPortrait : true

    this.orientation = isPortrait ? 'portrait' : 'landscape'
    this.format = 'pdf'
    this.destination = 'save'

    this.syncFormControls()
    await this.updatePreview()

    if (window.lucide) {
      window.lucide.createIcons()
    }
  }

  close() {
    this.container.classList.add('hidden')
    this.container.setAttribute('aria-hidden', 'true')
  }

  setDestination(dest) {
    this.destination = dest
    this.syncFormControls()
    this.updatePreview()
  }

  setFormat(fmt) {
    this.format = fmt
    this.syncFormControls()
    this.updatePreview()
  }

  async setOrientation(orient) {
    this.orientation = orient
    this.syncFormControls()
    await this.updatePreview()
  }

  async resetTo100Percent() {
    this.scale = 100
    const scaleSlider = document.getElementById('exp-scale-slider')
    const scaleValText = document.getElementById('exp-scale-val')
    if (scaleSlider) scaleSlider.value = 100
    if (scaleValText) scaleValText.textContent = '100%'
    await this.updatePreview()
  }

  getPaperDimensions() {
    const size = this.paperSizes[this.paperSizeKey] || this.paperSizes.A4
    return this.orientation === 'landscape'
      ? { width: size.height, height: size.width }
      : { width: size.width, height: size.height }
  }

  syncFormControls() {
    // 1. Destino
    const destSaveBtn = document.getElementById('exp-dest-save')
    const destPrintBtn = document.getElementById('exp-dest-print')
    if (destSaveBtn && destPrintBtn) {
      destSaveBtn.classList.toggle('is-active', this.destination === 'save')
      destPrintBtn.classList.toggle('is-active', this.destination === 'print')
    }

    // Ocultar formatos si el destino es imprimir
    const formatFieldset = document.getElementById('exp-fieldset-format')
    if (formatFieldset) {
      formatFieldset.classList.toggle('hidden', this.destination === 'print')
    }

    // 2. Formatos de archivo
    ;['png', 'jpg', 'pdf'].forEach((fmt) => {
      const btn = document.getElementById(`exp-fmt-${fmt}`)
      btn?.classList.toggle('is-active', this.format === fmt && this.destination === 'save')
    })

    // Ocultar sección de configuración de papel si no es PDF o Imprimir
    const paperFieldset = document.getElementById('exp-fieldset-paper')
    const showPaperSection = this.destination === 'print' || this.format === 'pdf'
    if (paperFieldset) {
      paperFieldset.classList.toggle('hidden', !showPaperSection)
    }

    // 3. Orientación
    const orientPortrait = document.getElementById('exp-orient-portrait')
    const orientLandscape = document.getElementById('exp-orient-landscape')

    if (orientPortrait && orientLandscape) {
      orientPortrait.classList.toggle('is-active', this.orientation === 'portrait')
      orientLandscape.classList.toggle('is-active', this.orientation === 'landscape')
    }

    // 4. Actualizar texto de botón de descarga/impresión
    if (this.submitBtn) {
      if (this.destination === 'print') {
        this.submitBtn.textContent = 'Imprimir'
      } else {
        const textMap = {
          png: 'Guardar como PNG',
          jpg: 'Guardar como JPG',
          pdf: 'Guardar como PDF',
        }
        this.submitBtn.textContent = textMap[this.format] || 'Guardar'
      }
    }
  }

  showSpinner() {
    const spinner = document.getElementById('exp-spinner')
    if (spinner) spinner.classList.remove('hidden')
  }

  hideSpinner() {
    const spinner = document.getElementById('exp-spinner')
    if (spinner) spinner.classList.add('hidden')
  }

  async updatePreview() {
    const previewContainer = document.getElementById('exp-paper-sheet')
    const imgEl = document.getElementById('exp-preview-img')
    if (!previewContainer || !imgEl || !this.canvasManager.canvas) return

    const currentMapId = appStore.getState().activeMapId
    const mapData = await this.mapRepository.getById(currentMapId)
    const isPortrait = mapData ? mapData.isPortrait : true

    const mapWidthMm = isPortrait ? 190 : 240
    const mapHeightMm = isPortrait ? 240 : 190

    let paperWidth = mapWidthMm
    let paperHeight = mapHeightMm

    const isPaperNeeded = this.destination === 'print' || this.format === 'pdf'
    if (isPaperNeeded) {
      const dimensions = this.getPaperDimensions()
      paperWidth = dimensions.width
      paperHeight = dimensions.height
    }

    const maxBoxWidth = 280
    const maxBoxHeight = 180

    const scaleX = maxBoxWidth / paperWidth
    const scaleY = maxBoxHeight / paperHeight
    const containerScale = Math.min(scaleX, scaleY)

    previewContainer.style.width = `${Math.round(paperWidth * containerScale)}px`
    previewContainer.style.height = `${Math.round(paperHeight * containerScale)}px`

    const scaleFactor = this.scale / 100
    const visualMapW = Math.round(mapWidthMm * containerScale * scaleFactor)
    const visualMapH = Math.round(mapHeightMm * containerScale * scaleFactor)

    imgEl.style.width = `${visualMapW}px`
    imgEl.style.height = `${visualMapH}px`

    if (isPaperNeeded) {
      imgEl.style.position = 'absolute'
      imgEl.style.left = '50%'
      imgEl.style.top = '50%'
      imgEl.style.transform = 'translate(-50%, -50%)'
    } else {
      imgEl.style.position = 'static'
      imgEl.style.transform = 'none'
    }

    try {
      this.showSpinner()
      const dataUrl = await ExportService.getExportDataURL(this.canvasManager, {
        format: 'png',
        quality: 0.7,
        targetWidth: 400, // resolución de preview baja
      })
      imgEl.src = dataUrl
    } catch (err) {
      console.error('Error generando previsualización:', err)
    } finally {
      this.hideSpinner()
    }
  }

  async getMapName() {
    const currentMapId = appStore.getState().activeMapId
    const mapData = await this.mapRepository.getById(currentMapId)
    return mapData ? mapData.name.replace(/\s+/g, '_') : 'mapa'
  }

  async executeAction() {
    if (this.destination === 'print') {
      await this.executePrint()
    } else if (this.format === 'pdf') {
      await this.executePDFExport()
    } else {
      await this.executeImageExport()
    }
    this.close()
  }

  async executeImageExport() {
    const currentMapId = appStore.getState().activeMapId
    const mapData = await this.mapRepository.getById(currentMapId)
    const isPortrait = mapData ? mapData.isPortrait : true

    const mapWidthMm = isPortrait ? 190 : 240
    const mapHeightMm = isPortrait ? 240 : 190

    const DPI = this.quality === 1 ? 72 : this.quality === 3 ? 300 : 150
    const mmToInches = 1 / 25.4
    const targetWidthPx = Math.round(mapWidthMm * mmToInches * DPI * (this.scale / 100))
    const targetHeightPx = Math.round(mapHeightMm * mmToInches * DPI * (this.scale / 100))

    const dataUrl = await ExportService.getExportDataURL(this.canvasManager, {
      format: this.format,
      quality: 0.95,
      targetWidth: targetWidthPx,
      targetHeight: targetHeightPx,
    })

    const mapName = await this.getMapName()
    const fileName = `mapa_${mapName}_anotado.${this.format}`
    const link = document.createElement('a')
    link.download = fileName
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async executePDFExport() {
    const paper = this.getPaperDimensions()
    const doc = new jsPDF({
      orientation: this.orientation,
      unit: 'mm',
      format: [paper.width, paper.height],
    })

    const currentMapId = appStore.getState().activeMapId
    const mapData = await this.mapRepository.getById(currentMapId)
    const isPortrait = mapData ? mapData.isPortrait : true

    const mapWidthMm = isPortrait ? 190 : 240
    const mapHeightMm = isPortrait ? 240 : 190

    const DPI = this.quality === 1 ? 72 : this.quality === 3 ? 300 : 150
    const mmToInches = 1 / 25.4
    const targetWidthPx = Math.round(mapWidthMm * mmToInches * DPI)
    const targetHeightPx = Math.round(mapHeightMm * mmToInches * DPI)

    const dataUrl = await ExportService.getExportDataURL(this.canvasManager, {
      format: 'png',
      quality: 1.0,
      targetWidth: targetWidthPx,
      targetHeight: targetHeightPx,
    })

    const scaleFactor = this.scale / 100
    const finalW = mapWidthMm * scaleFactor
    const finalH = mapHeightMm * scaleFactor

    const offsetX = (paper.width - finalW) / 2
    const offsetY = (paper.height - finalH) / 2

    doc.addImage(dataUrl, 'PNG', offsetX, offsetY, finalW, finalH)
    const mapName = await this.getMapName()
    doc.save(`mapa_${mapName}_anotado.pdf`)
  }

  async executePrint() {
    const paper = this.getPaperDimensions()

    const currentMapId = appStore.getState().activeMapId
    const mapData = await this.mapRepository.getById(currentMapId)
    const isPortrait = mapData ? mapData.isPortrait : true

    const mapWidthMm = isPortrait ? 190 : 240
    const mapHeightMm = isPortrait ? 240 : 190

    const DPI = 150
    const mmToInches = 1 / 25.4
    const targetWidthPx = Math.round(mapWidthMm * mmToInches * DPI)
    const targetHeightPx = Math.round(mapHeightMm * mmToInches * DPI)

    const dataUrl = await ExportService.getExportDataURL(this.canvasManager, {
      format: 'png',
      quality: 1.0,
      targetWidth: targetWidthPx,
      targetHeight: targetHeightPx,
    })

    const scaleFactor = this.scale / 100
    const finalW = mapWidthMm * scaleFactor
    const finalH = mapHeightMm * scaleFactor

    const offsetX = (paper.width - finalW) / 2
    const offsetY = (paper.height - finalH) / 2

    const printStyle = document.createElement('style')
    printStyle.id = 'nbi-print-page-style'
    printStyle.innerHTML = `
      @page {
        size: ${paper.width}mm ${paper.height}mm;
        margin: 0;
      }
    `
    document.head.appendChild(printStyle)

    const printSection = document.createElement('div')
    printSection.id = 'nbi-print-section'

    printSection.innerHTML = `
      <div style="width: ${paper.width}mm; height: ${paper.height}mm; position: relative; background: #fff; overflow: hidden;">
        <img src="${dataUrl}" style="position: absolute; left: ${offsetX}mm; top: ${offsetY}mm; width: ${finalW}mm; height: ${finalH}mm; object-fit: contain;" alt="Mapa impreso" />
      </div>
    `

    document.body.appendChild(printSection)

    setTimeout(() => {
      window.print()
      setTimeout(() => {
        document.body.removeChild(printSection)
        document.head.removeChild(printStyle)
      }, 500)
    }, 200)
  }
}
