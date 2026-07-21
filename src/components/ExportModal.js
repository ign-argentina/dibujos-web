import { jsPDF } from 'jspdf'
import { appState } from '../state/appState.js'
import { mapsCatalog } from '../config/mapsCatalog.js'

export class ExportModal {
  constructor(canvasManager) {
    if (!canvasManager) {
      throw new TypeError('ExportModal requiere una instancia de CanvasManager')
    }

    this.canvasManager = canvasManager
    this.modalEl = document.getElementById('export-modal')
    this.closeBtn = document.getElementById('export-modal-close')
    this.cancelBtn = document.getElementById('exp-btn-cancel')
    this.submitBtn = document.getElementById('exp-btn-submit')

    // Diccionario de dimensiones físicas de papel (en mm)
    this.paperSizes = {
      A4: { width: 210, height: 297 },
      Oficio: { width: 215.9, height: 355.6 },
    }

    // Estado inicial de la exportación (Predeterminado a formato escolar 19x24 cm)
    this.destination = 'save' // 'save' | 'print'
    this.format = 'png' // 'png' | 'jpg' | 'pdf'
    this.paperSizeKey = 'A4'
    this.orientation = 'portrait' // 'portrait' | 'landscape'
    this.scale = 200 // 200% equivale a las dimensiones escolares 19x24 cm en A4
    this.margin = 0 // Sin margen (0 mm permanente)
    this.quality = 2 // 1, 2, 3 (multiplicador DPI)

    this.init()
  }

  init() {
    if (!this.modalEl) return
    this.setupListeners()
  }

  setupListeners() {
    // Abrir/Cerrar
    this.closeBtn?.addEventListener('click', () => this.close())
    this.cancelBtn?.addEventListener('click', () => this.close())

    // Cerrar con Escape o clic fuera
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close()
    })

    document.addEventListener('keydown', (e) => {
      if (!this.modalEl.classList.contains('hidden') && e.key === 'Escape') {
        this.close()
      }
    })

    // Controles de Destino (Guardar / Imprimir)
    const destSaveBtn = document.getElementById('exp-dest-save')
    const destPrintBtn = document.getElementById('exp-dest-print')

    destSaveBtn?.addEventListener('click', () => {
      this.setDestination('save')
    })
    destPrintBtn?.addEventListener('click', () => {
      this.setDestination('print')
    })

    // Controles de Formato (PNG / JPG / PDF)
    ;['png', 'jpg', 'pdf'].forEach((fmt) => {
      const btn = document.getElementById(`exp-fmt-${fmt}`)
      btn?.addEventListener('click', () => {
        this.setFormat(fmt)
      })
    })

    // Selector de Tamaño de Papel
    const paperSelect = document.getElementById('exp-paper-size')
    paperSelect?.addEventListener('change', (e) => {
      this.paperSizeKey = e.target.value
      this.updatePreview()
    })

    // Controles de Orientación (Vertical / Horizontal)
    const orientPortraitBtn = document.getElementById('exp-orient-portrait')
    const orientLandscapeBtn = document.getElementById('exp-orient-landscape')

    orientPortraitBtn?.addEventListener('click', () => {
      this.setOrientation('portrait')
    })
    orientLandscapeBtn?.addEventListener('click', () => {
      this.setOrientation('landscape')
    })

    // Slider de Escala
    const scaleSlider = document.getElementById('exp-scale-slider')
    const scaleValText = document.getElementById('exp-scale-val')
    scaleSlider?.addEventListener('input', (e) => {
      this.scale = parseInt(e.target.value, 10)
      if (scaleValText) scaleValText.textContent = `${this.scale}%`
      this.updatePreview()
    })

    // Botones de Preajuste Escolar (Vertical / Horizontal)
    const presetVertBtn = document.getElementById('exp-btn-preset-vert')
    presetVertBtn?.addEventListener('click', () => {
      this.applySchoolPreset('portrait')
    })

    const presetHorizBtn = document.getElementById('exp-btn-preset-horiz')
    presetHorizBtn?.addEventListener('click', () => {
      this.applySchoolPreset('landscape')
    })

    // Selector de Calidad
    const qualitySelect = document.getElementById('exp-quality-select')
    qualitySelect?.addEventListener('change', (e) => {
      this.quality = parseInt(e.target.value, 10)
      this.updatePreview()
    })

    // Botón Submit Final
    this.submitBtn?.addEventListener('click', () => {
      this.executeAction()
    })
  }

  setDestination(dest) {
    this.destination = dest

    const destSaveBtn = document.getElementById('exp-dest-save')
    const destPrintBtn = document.getElementById('exp-dest-print')
    const formatSection = document.getElementById('exp-section-format')
    const qualitySection = document.getElementById('exp-section-quality')

    if (dest === 'save') {
      destSaveBtn?.classList.add('is-active')
      destSaveBtn?.setAttribute('aria-pressed', 'true')
      destPrintBtn?.classList.remove('is-active')
      destPrintBtn?.setAttribute('aria-pressed', 'false')

      formatSection?.classList.remove('hidden')
      qualitySection?.classList.remove('hidden')
    } else {
      destPrintBtn?.classList.add('is-active')
      destPrintBtn?.setAttribute('aria-pressed', 'true')
      destSaveBtn?.classList.remove('is-active')
      destSaveBtn?.setAttribute('aria-pressed', 'false')

      formatSection?.classList.add('hidden')
      qualitySection?.classList.add('hidden')
    }

    this.updateSubmitButtonUI()
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
  }

  setOrientation(orient) {
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

    this.updatePreview()
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

  applySchoolPreset(orientation = 'portrait') {
    this.paperSizeKey = 'A4'
    this.orientation = orientation
    const targetScale = orientation === 'portrait' ? 200 : 120
    this.scale = targetScale
    this.margin = 0

    const paperSelect = document.getElementById('exp-paper-size')
    if (paperSelect) paperSelect.value = 'A4'

    const scaleSlider = document.getElementById('exp-scale-slider')
    const scaleValText = document.getElementById('exp-scale-val')
    if (scaleSlider) scaleSlider.value = targetScale
    if (scaleValText) scaleValText.textContent = `${targetScale}%`

    this.setOrientation(orientation)
    this.updatePreview()
  }

  open() {
    if (!this.modalEl) return
    this.modalEl.classList.remove('hidden')
    this.applySchoolPreset('portrait')

    if (window.lucide) {
      window.lucide.createIcons()
    }
  }

  close() {
    if (!this.modalEl) return
    this.modalEl.classList.add('hidden')
  }

  updatePreview() {
    const paper = this.getPaperDimensions()
    const sheetEl = document.getElementById('exp-paper-sheet')
    const marginBoxEl = document.getElementById('exp-margin-box')
    const imgEl = document.getElementById('exp-preview-img')

    if (!sheetEl || !imgEl) return

    // Calcular proporción para encajar la vista previa en el contenedor (max 300px alto / 280px ancho)
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
    const marginPct = (this.margin / paper.width) * 100
    marginBoxEl.style.padding = `${marginPct}%`

    // Obtener imagen actual del lienzo para vista previa rápida
    const dataUrl = this.canvasManager.getExportDataURL({ format: 'png', quality: 0.8, multiplier: 1 })
    imgEl.src = dataUrl
    imgEl.style.transform = `scale(${this.scale / 100})`
  }

  getMapName() {
    const currentMapId = appState.getActiveMapId()
    const mapData = mapsCatalog.find((m) => m.id === currentMapId)
    return mapData ? mapData.name.replace(/\s+/g, '_') : 'mapa'
  }

  async executeAction() {
    if (this.destination === 'print') {
      this.executePrint()
    } else if (this.format === 'pdf') {
      this.executePDFExport()
    } else {
      this.executeImageExport()
    }
    this.close()
  }

  executeImageExport() {
    const dataUrl = this.canvasManager.getExportDataURL({
      format: this.format,
      quality: 0.95,
      multiplier: this.quality,
    })

    const fileName = `mapa_${this.getMapName()}_anotado.${this.format}`
    const link = document.createElement('a')
    link.download = fileName
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  executePDFExport() {
    const paper = this.getPaperDimensions()
    const doc = new jsPDF({
      orientation: this.orientation,
      unit: 'mm',
      format: [paper.width, paper.height],
    })

    const dataUrl = this.canvasManager.getExportDataURL({
      format: 'png',
      quality: 1.0,
      multiplier: Math.max(this.quality, 2),
    })

    const margin = this.margin
    const printableW = paper.width - 2 * margin
    const printableH = paper.height - 2 * margin

    const canvasW = this.canvasManager.canvasWidth || 800
    const canvasH = this.canvasManager.canvasHeight || 600
    const canvasAR = canvasW / canvasH
    const printableAR = printableW / printableH

    let fitW = printableW
    let fitH = printableW / canvasAR

    if (canvasAR < printableAR) {
      fitH = printableH
      fitW = printableH * canvasAR
    }

    const scaleFactor = this.scale / 100
    const finalW = fitW * scaleFactor
    const finalH = fitH * scaleFactor

    const offsetX = margin + (printableW - finalW) / 2
    const offsetY = margin + (printableH - finalH) / 2

    doc.addImage(dataUrl, 'PNG', offsetX, offsetY, finalW, finalH)
    doc.save(`mapa_${this.getMapName()}_anotado.pdf`)
  }

  executePrint() {
    const paper = this.getPaperDimensions()
    const dataUrl = this.canvasManager.getExportDataURL({
      format: 'png',
      quality: 1.0,
      multiplier: 2,
    })

    const printSection = document.createElement('div')
    printSection.id = 'nbi-print-section'

    const margin = this.margin
    const printableW = paper.width - 2 * margin
    const printableH = paper.height - 2 * margin

    const canvasW = this.canvasManager.canvasWidth || 800
    const canvasH = this.canvasManager.canvasHeight || 600
    const canvasAR = canvasW / canvasH
    const printableAR = printableW / printableH

    let fitW = printableW
    let fitH = printableW / canvasAR

    if (canvasAR < printableAR) {
      fitH = printableH
      fitW = printableH * canvasAR
    }

    const scaleFactor = this.scale / 100
    const finalW = fitW * scaleFactor
    const finalH = fitH * scaleFactor

    const offsetX = margin + (printableW - finalW) / 2
    const offsetY = margin + (printableH - finalH) / 2

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
      }, 500)
    }, 200)
  }
}
