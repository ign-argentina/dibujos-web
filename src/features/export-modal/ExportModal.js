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

    // Diccionario de dimensiones físicas de papel (en mm)
    this.paperSizes = {
      A4: { width: 210, height: 297 },
      Oficio: { width: 215.9, height: 355.6 },
    }

    // Estado inicial de la exportación (Predeterminado a formato escolar 19x24 cm y formato PDF)
    this.destination = 'save' // 'save' | 'print'
    this.format = 'pdf' // 'png' | 'jpg' | 'pdf'
    this.paperSizeKey = 'A4'
    this.orientation = 'portrait' // 'portrait' | 'landscape'
    this.scale = 100 // Escala inicial 100%
    this.margin = 0 // Sin margen (0 mm permanente)
    this.quality = 2 // 1, 2, 3 (multiplicador DPI)

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

    // Cerrar con Escape o clic fuera
    this.addEvent(this.container, 'click', (e) => {
      if (e.target === this.container) this.close()
    })

    this.addEvent(document, 'keydown', (e) => {
      if (!this.container.classList.contains('hidden') && e.key === 'Escape') {
        this.close()
      }
    })

    // Controles de Destino (Guardar / Imprimir)
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

    // Selector de Tamaño de Papel
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
      this.addEvent(orientPortraitBtn, 'click', async () => {
        await this.setOrientation('portrait')
      })
    }
    if (orientLandscapeBtn) {
      this.addEvent(orientLandscapeBtn, 'click', async () => {
        await this.setOrientation('landscape')
      })
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

    // Botón de Restablecer a Escala 100% (Formato Escolar)
    const preset100Btn = document.getElementById('exp-btn-preset-100')
    if (preset100Btn) {
      this.addEvent(preset100Btn, 'click', async () => {
        await this.resetTo100Percent()
      })
    }

    // Selector de Calidad
    const qualitySelect = document.getElementById('exp-quality-select')
    if (qualitySelect) {
      this.addEvent(qualitySelect, 'change', async (e) => {
        this.quality = parseInt(e.target.value, 10)
        await this.updatePreview()
      })
    }

    // Botón Submit Final
    if (this.submitBtn) {
      this.addEvent(this.submitBtn, 'click', async () => {
        await this.executeAction()
      })
    }
  }

  setDestination(dest) {
    this.destination = dest

    const destSaveBtn = document.getElementById('exp-dest-save')
    const destPrintBtn = document.getElementById('exp-dest-print')
    const formatSection = document.getElementById('exp-section-format') || document.getElementById('exp-fieldset-format')
    const qualitySection = document.getElementById('exp-section-quality')

    if (dest === 'save') {
      destSaveBtn?.classList.add('is-active')
      destSaveBtn?.setAttribute('aria-pressed', 'true')
      destPrintBtn?.classList.remove('is-active')
      destPrintBtn?.setAttribute('aria-pressed', 'false')

      formatSection?.classList.remove('hidden')
      if (this.format !== 'pdf') {
        qualitySection?.classList.remove('hidden')
      } else {
        qualitySection?.classList.add('hidden')
      }
    } else {
      destPrintBtn?.classList.add('is-active')
      destPrintBtn?.setAttribute('aria-pressed', 'true')
      destSaveBtn?.classList.remove('is-active')
      destSaveBtn?.setAttribute('aria-pressed', 'false')

      formatSection?.classList.add('hidden')
      qualitySection?.classList.add('hidden')
    }

    this.updateSubmitButtonUI()
    this.updatePreview()
  }

  setFormat(fmt) {
    this.format = fmt
    ;['png', 'jpg', 'pdf'].forEach((f) => {
      const btn = document.getElementById(`exp-fmt-${f}`)
      if (btn) {
        const active = f === fmt
        btn.classList.toggle('is-active', active)
        btn.setAttribute('aria-pressed', active ? 'true' : 'false')
      }
    })

    const qualitySection = document.getElementById('exp-section-quality')
    if (fmt === 'pdf') {
      qualitySection?.classList.add('hidden')
    } else if (this.destination === 'save') {
      qualitySection?.classList.remove('hidden')
    }

    this.updateSubmitButtonUI()
    this.updatePreview()
  }

  async setOrientation(orient) {
    this.orientation = orient
    const portraitBtn = document.getElementById('exp-orient-portrait')
    const landscapeBtn = document.getElementById('exp-orient-landscape')

    if (orient === 'portrait') {
      portraitBtn?.classList.add('is-active')
      portraitBtn?.setAttribute('aria-pressed', 'true')
      landscapeBtn?.classList.remove('is-active')
      landscapeBtn?.setAttribute('aria-pressed', 'false')
    } else {
      landscapeBtn?.classList.add('is-active')
      landscapeBtn?.setAttribute('aria-pressed', 'true')
      portraitBtn?.classList.remove('is-active')
      portraitBtn?.setAttribute('aria-pressed', 'false')
    }

    await this.updatePreview()
  }

  updateSubmitButtonUI() {
    const textEl = document.getElementById('exp-submit-text')
    const iconEl = document.getElementById('exp-submit-icon')

    if (this.destination === 'print') {
      if (textEl) textEl.textContent = 'Imprimir Mapa'
      if (iconEl) iconEl.setAttribute('data-lucide', 'printer')
    } else {
      if (textEl) textEl.textContent = `Descargar ${this.format.toUpperCase()}`
      if (iconEl) iconEl.setAttribute('data-lucide', 'download')
    }

    if (window.lucide) {
      window.lucide.createIcons()
    }
  }

  getPaperDimensions() {
    const base = this.paperSizes[this.paperSizeKey] || this.paperSizes.A4
    if (this.orientation === 'landscape') {
      return { width: base.height, height: base.width }
    }
    return { width: base.width, height: base.height }
  }

  async resetTo100Percent() {
    this.scale = 100
    const scaleSlider = document.getElementById('exp-scale-slider')
    const scaleValText = document.getElementById('exp-scale-val')
    if (scaleSlider) scaleSlider.value = 100
    if (scaleValText) scaleValText.textContent = '100%'
    await this.updatePreview()
  }

  async open() {
    this.container.classList.remove('hidden')
    this.container.setAttribute('aria-hidden', 'false')

    // Detectar si el mapa activo es vertical o apaisado
    const currentMapId = appStore.getState().activeMapId
    const mapData = await this.mapRepository.getById(currentMapId)
    const isPortrait = mapData ? mapData.isPortrait : true

    this.paperSizeKey = 'A4'
    this.orientation = isPortrait ? 'portrait' : 'landscape'
    this.scale = 100
    this.margin = 0
    this.format = 'pdf'
    this.destination = 'save'

    const paperSelect = document.getElementById('exp-paper-size')
    if (paperSelect) paperSelect.value = 'A4'

    const scaleSlider = document.getElementById('exp-scale-slider')
    const scaleValText = document.getElementById('exp-scale-val')
    if (scaleSlider) scaleSlider.value = 100
    if (scaleValText) scaleValText.textContent = '100%'

    // Ocultar sección de orientación
    const orientBtn = document.getElementById('exp-orient-portrait')
    const orientSection = orientBtn?.closest('.nbi-export-modal__section') || orientBtn?.closest('.nbi-context-section')
    if (orientSection) {
      orientSection.classList.add('hidden')
    }

    // Sincronizar el estado inicial de la UI (formato y destino)
    this.setDestination(this.destination)
    this.setFormat(this.format)
    await this.setOrientation(this.orientation)

    if (window.lucide) {
      window.lucide.createIcons()
    }
  }

  close() {
    this.container.classList.add('hidden')
    this.container.setAttribute('aria-hidden', 'true')
  }

  async updatePreview() {
    const paper = this.getPaperDimensions()
    const sheetEl = document.getElementById('exp-paper-sheet')
    const marginBoxEl = document.getElementById('exp-margin-box')
    const imgEl = document.getElementById('exp-preview-img')

    if (!sheetEl || !imgEl) return

    // Calcular proporción para encajar la vista previa en el contenedor (max 280px alto / 260px ancho)
    const maxH = 280
    const maxW = 260
    const paperAR = paper.width / paper.height

    let sheetH = maxH
    let sheetW = maxH * paperAR

    if (sheetW > maxW) {
      sheetW = maxW
      sheetH = maxW / paperAR
    }

    sheetEl.style.width = `${Math.round(sheetW)}px`
    sheetEl.style.height = `${Math.round(sheetH)}px`

    // Aplicar márgenes visuales
    if (marginBoxEl) {
      const marginPct = (this.margin / paper.width) * 100
      marginBoxEl.style.padding = `${marginPct}%`
    }

    // Obtener isPortrait del mapa activo
    const currentMapId = appStore.getState().activeMapId
    const mapData = await this.mapRepository.getById(currentMapId)
    const isPortrait = mapData ? mapData.isPortrait : true

    const mapWidthMm = isPortrait ? 190 : 240
    const mapHeightMm = isPortrait ? 240 : 190

    // Obtener imagen del lienzo con tamaño proporcional
    const DPI = 150
    const mmToInches = 1 / 25.4
    const targetWidthPx = Math.round(mapWidthMm * mmToInches * DPI)
    const targetHeightPx = Math.round(mapHeightMm * mmToInches * DPI)

    // USAR canvasManager.getExportDataURL que es sincrono y super rapido para previsualizar sin lag
    const dataUrl = this.canvasManager.getExportDataURL({
      format: 'png',
      quality: 0.8,
      targetWidth: targetWidthPx,
      targetHeight: targetHeightPx,
    })

    imgEl.src = dataUrl

    // Escalar el mapa de manera proporcional al tamaño de la hoja en la vista previa
    const scaleFactor = this.scale / 100
    const finalMapW = (mapWidthMm / paper.width) * sheetW * scaleFactor
    const finalMapH = (mapHeightMm / paper.height) * sheetH * scaleFactor

    imgEl.style.width = `${Math.round(finalMapW)}px`
    imgEl.style.height = `${Math.round(finalMapH)}px`
    imgEl.style.maxWidth = 'none'
    imgEl.style.maxHeight = 'none'
    imgEl.style.transform = 'none'
  }

  async executeAction() {
    const paper = this.getPaperDimensions()
    const options = {
      format: this.format,
      scale: this.scale,
      quality: this.quality,
      orientation: this.orientation,
      paperWidth: paper.width,
      paperHeight: paper.height,
    }

    if (this.destination === 'print') {
      await ExportService.print(this.canvasManager, options)
    } else if (this.format === 'pdf') {
      await ExportService.exportToPDF(this.canvasManager, options)
    } else {
      await ExportService.exportToImage(this.canvasManager, options)
    }
    this.close()
  }
}
