import { Component } from '../Component.js'
import { configRepository } from '../../core/repositories/ConfigRepository.js'

/**
 * Componente que gestiona el menú contextual flotante para la edición de las figuras sobre el canvas.
 * Hereda de Component para un manejo limpio del ciclo de vida y eventos del DOM.
 */
export class ContextMenu extends Component {
  constructor(canvasManager) {
    super(canvasManager.container)
    this.canvasManager = canvasManager
    this.canvas = canvasManager.canvas
    this.triggerBtn = null
    this.popoverMenu = null
    this.isOpen = false
    this.presetColors = [
      '#FAEB8B',
      '#82D3F8',
      '#7ABE7D',
      '#E5828C',
      '#CC94D6',
      '#FFA07A',
      '#FFD700',
      '#98FB98',
      '#AFEEEE',
      '#FFB6C1',
      '#B0C4DE',
      '#E6E6FA',
      '#FFA500',
      '#FFFFFF',
      '#000000',
    ]

    this.mount()
  }

  render() {
    const uiConfig = configRepository.getUiConfig()

    // 1. Botón disparador flotante
    this.triggerBtn = document.createElement('button')
    this.triggerBtn.className = 'nbi-btn nbi-context-trigger hidden'
    this.triggerBtn.setAttribute('title', 'Opciones de la figura')
    this.triggerBtn.setAttribute('aria-label', 'Abrir menú contextual de la figura seleccionada')
    this.triggerBtn.setAttribute('aria-expanded', 'false')
    this.triggerBtn.innerHTML = `<i data-lucide="sliders"></i>`
    this.container.appendChild(this.triggerBtn)

    // 2. Menu Popover emergente
    this.popoverMenu = document.createElement('div')
    this.popoverMenu.className = 'nbi-window-floating nbi-context-popover hidden'
    this.popoverMenu.setAttribute('role', 'dialog')
    this.popoverMenu.setAttribute('aria-label', 'Opciones y propiedades de la figura seleccionada')

    // Personalización dinámica del menú contextual desde config.json
    if (uiConfig.contextMenuBackgroundColor) {
      this.popoverMenu.style.backgroundColor = uiConfig.contextMenuBackgroundColor
    }

    this.container.appendChild(this.popoverMenu)
  }

  bindEvents() {
    // Evento de clic en el disparador flotante
    this.addEvent(this.triggerBtn, 'click', (e) => {
      e.stopPropagation()
      this.togglePopover()
    })

    // Ocultar popover si se hace clic fuera
    this.addEvent(document, 'click', (e) => {
      if (
        this.isOpen &&
        !this.popoverMenu.contains(e.target) &&
        !this.triggerBtn.contains(e.target)
      ) {
        this.closePopover()
      }
    })

    // Ocultar popover con Escape
    this.addEvent(document, 'keydown', (e) => {
      if (this.isOpen && e.key === 'Escape') {
        this.closePopover()
        this.triggerBtn.focus()
      }
    })

    // Escuchar eventos del canvas
    this.setupCanvasEvents()
  }

  unmount() {
    super.unmount()
    if (this.triggerBtn && this.triggerBtn.parentNode === this.container) {
      this.container.removeChild(this.triggerBtn)
    }
  }

  setupCanvasEvents() {
    this.canvas = this.canvasManager.canvas
    if (!this.canvas) return

    const updatePositionHandler = () => {
      const activeObj = this.canvas.getActiveObject()
      if (activeObj && activeObj !== this.canvasManager.currentMapImage) {
        this.updateTriggerPosition(activeObj)
        if (this.isOpen) {
          this.updatePopoverPosition(activeObj)
        }
      } else {
        this.hideAll()
      }
    }

    this.canvas.on('selection:created', updatePositionHandler)
    this.canvas.on('selection:updated', updatePositionHandler)
    this.canvas.on('selection:cleared', () => this.hideAll())

    this.canvas.on('object:moving', updatePositionHandler)
    this.canvas.on('object:scaling', updatePositionHandler)
    this.canvas.on('object:rotating', updatePositionHandler)
    this.canvas.on('object:modified', updatePositionHandler)

    this.canvas.on('mouse:wheel', updatePositionHandler)
    this.canvas.on('mouse:move', () => {
      if (this.canvas.isDrawingMode || this.canvasManager.isDrawingShape) {
        this.hideAll()
      } else {
        updatePositionHandler()
      }
    })
  }

  updateTriggerPosition(activeObj) {
    if (!activeObj || activeObj === this.canvasManager.currentMapImage) {
      this.hideAll()
      return
    }

    const bound = activeObj.getBoundingRect()
    const containerRect = this.container.getBoundingClientRect()

    let left = bound.left + bound.width + 10
    let top = bound.top - 12

    if (left + 50 > containerRect.width) {
      left = bound.left - 54
    }
    if (top < 10) {
      top = bound.top + bound.height + 10
    }

    this.triggerBtn.style.left = `${Math.max(10, left)}px`
    this.triggerBtn.style.top = `${Math.max(10, top)}px`
    this.triggerBtn.classList.remove('hidden')

    if (window.lucide) {
      window.lucide.createIcons()
    }
  }

  updatePopoverPosition(activeObj) {
    if (!activeObj || activeObj === this.canvasManager.currentMapImage) {
      this.closePopover()
      return
    }

    const bound = activeObj.getBoundingRect()
    const containerRect = this.container.getBoundingClientRect()
    const popoverRect = this.popoverMenu.getBoundingClientRect()

    let left = bound.left + bound.width + 10
    let top = bound.top

    if (left + popoverRect.width > containerRect.width) {
      left = bound.left - popoverRect.width - 10
    }

    if (top + popoverRect.height > containerRect.height) {
      top = containerRect.height - popoverRect.height - 10
    }

    this.popoverMenu.style.left = `${Math.max(10, left)}px`
    this.popoverMenu.style.top = `${Math.max(10, top)}px`
  }

  togglePopover() {
    if (this.isOpen) {
      this.closePopover()
    } else {
      this.openPopover()
    }
  }

  openPopover() {
    const activeObj = this.canvas?.getActiveObject()
    if (!activeObj) return

    this.isOpen = true
    this.triggerBtn.setAttribute('aria-expanded', 'true')
    this.triggerBtn.classList.add('is-active')
    this.popoverMenu.classList.remove('hidden')

    this.buildPopoverContent(activeObj)
    this.updatePopoverPosition(activeObj)
  }

  closePopover() {
    this.isOpen = false
    this.triggerBtn.setAttribute('aria-expanded', 'false')
    this.triggerBtn.classList.remove('is-active')
    this.popoverMenu.classList.add('hidden')
  }

  hideAll() {
    this.closePopover()
    this.triggerBtn.classList.add('hidden')
  }

  getFriendlyTypeName(obj) {
    if (obj.type === 'textbox') return 'Texto'
    if (obj.type === 'rect') return 'Rectángulo'
    if (obj.type === 'circle') return 'Círculo'
    if (obj.type === 'image' && obj !== this.canvasManager.currentMapImage) return 'Imagen'
    if (obj.type === 'path') {
      return obj.fill === 'transparent' ? 'Flecha' : 'Dibujo'
    }
    if (obj.type === 'group') return 'Sticker'
    return 'Figura'
  }

  buildPopoverContent(obj) {
    const typeName = this.getFriendlyTypeName(obj)
    const isText = obj.type === 'textbox'
    const isImage = obj.type === 'image' && obj !== this.canvasManager.currentMapImage

    const showStrokeOption =
      !(obj.type === 'path' && obj.fill === 'transparent') && obj.type !== 'group' && !isImage

    let contentHtml = ''

    // --- SECCIÓN DE ESTILOS Y COLORES ---
    if (!isImage) {
      contentHtml += `
        <div class="nbi-context-section">
          <label class="nbi-context-label">Color de Relleno</label>
          <div class="nbi-context-colors">
      `
      this.presetColors.forEach((color) => {
        const isSelected = (obj.fill || '').toUpperCase() === color.toUpperCase()
        contentHtml += `
          <button class="nbi-color-chip ${isSelected ? 'is-active' : ''}" 
                  style="background-color: ${color};" 
                  data-color="${color}" 
                  aria-label="Color ${color}"></button>
        `
      })
      contentHtml += `
          </div>
        </div>
      `

      if (showStrokeOption) {
        contentHtml += `
          <div class="nbi-context-section">
            <label class="nbi-context-label">Color del Borde</label>
            <div class="nbi-context-stroke-colors">
        `
        this.presetColors.forEach((color) => {
          const isSelected = (obj.stroke || '').toUpperCase() === color.toUpperCase()
          contentHtml += `
            <button class="nbi-color-chip ${isSelected ? 'is-active' : ''}" 
                    style="background-color: ${color};" 
                    data-stroke-color="${color}" 
                    aria-label="Color borde ${color}"></button>
          `
        })
        contentHtml += `
            </div>
            <div class="nbi-context-stroke-width-group">
              <label for="ctx-stroke-width" class="nbi-context-label">Grosor: <span id="ctx-stroke-val">${obj.strokeWidth || 0}px</span></label>
              <input type="range" id="ctx-stroke-width" min="0" max="30" value="${obj.strokeWidth || 0}" />
            </div>
          </div>
        `
      }
    }

    // --- SECCIÓN DE TEXTO ---
    if (isText) {
      const isBold = obj.fontWeight === 'bold'
      const isItalic = obj.fontStyle === 'italic'
      const align = obj.textAlign || 'left'

      contentHtml += `
        <div class="nbi-context-section">
          <label class="nbi-context-label">Formato de Texto</label>
          <div class="nbi-context-text-tools">
            <button class="nbi-btn nbi-btn-sm ${isBold ? 'is-active' : ''}" id="ctx-txt-bold" title="Negrita"><b>N</b></button>
            <button class="nbi-btn nbi-btn-sm ${isItalic ? 'is-active' : ''}" id="ctx-txt-italic" title="Cursiva"><i>I</i></button>
            <button class="nbi-btn nbi-btn-sm ${align === 'left' ? 'is-active' : ''}" id="ctx-txt-left" title="Alinear Izquierda"><i data-lucide="align-left"></i></button>
            <button class="nbi-btn nbi-btn-sm ${align === 'center' ? 'is-active' : ''}" id="ctx-txt-center" title="Alinear Centro"><i data-lucide="align-center"></i></button>
            <button class="nbi-btn nbi-btn-sm ${align === 'right' ? 'is-active' : ''}" id="ctx-txt-right" title="Alinear Derecha"><i data-lucide="align-right"></i></button>
          </div>
        </div>
      `
    }

    // --- SECCIÓN DE IMAGEN ---
    if (isImage) {
      const isFlippedX = obj.flipX
      const isFlippedY = obj.flipY
      const isLocked = obj.lockMovementX

      contentHtml += `
        <div class="nbi-context-section">
          <label class="nbi-context-label">Propiedades de Imagen</label>
          <div class="nbi-context-image-tools">
            <button class="nbi-btn nbi-btn-sm ${isFlippedX ? 'is-active' : ''}" id="ctx-img-flip-x" title="Reflejo Horizontal"><i data-lucide="flip-horizontal"></i> H</button>
            <button class="nbi-btn nbi-btn-sm ${isFlippedY ? 'is-active' : ''}" id="ctx-img-flip-y" title="Reflejo Vertical"><i data-lucide="flip-vertical"></i> V</button>
            <button class="nbi-btn nbi-btn-sm ${isLocked ? 'is-active' : ''}" id="ctx-img-lock" title="Bloquear Posición"><i data-lucide="${isLocked ? 'lock' : 'unlock'}"></i> Fijar</button>
          </div>
          <label class="nbi-context-label" style="margin-top: 10px;">Filtros de Efecto</label>
          <div class="nbi-context-filters-grid">
            <button class="nbi-btn nbi-btn-sm ${this.canvasManager.hasFilter(obj, 'grayscale') ? 'is-active' : ''}" id="ctx-img-grayscale">Grises</button>
            <button class="nbi-btn nbi-btn-sm ${this.canvasManager.hasFilter(obj, 'invert') ? 'is-active' : ''}" id="ctx-img-invert">Invertir</button>
            <button class="nbi-btn nbi-btn-sm ${this.canvasManager.hasFilter(obj, 'sepia') ? 'is-active' : ''}" id="ctx-img-sepia">Sepia</button>
          </div>
        </div>
      `
    }

    const html = `
      <div class="nbi-window-header">
        <span class="nbi-window-title">${typeName}</span>
        <button class="nbi-btn-close" id="ctx-close-btn" aria-label="Cerrar opciones">&times;</button>
      </div>
      <div class="nbi-window-body">
        ${contentHtml}
        <div class="nbi-context-actions">
          <button class="nbi-btn nbi-btn-sm" id="ctx-act-front" title="Traer al frente">
            <i data-lucide="arrow-up"></i> Frente
          </button>
          <button class="nbi-btn nbi-btn-sm" id="ctx-act-back" title="Enviar al fondo">
            <i data-lucide="arrow-down"></i> Fondo
          </button>
          <button class="nbi-btn nbi-btn-sm nbi-btn-danger" id="ctx-act-delete" title="Eliminar figura">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `

    this.popoverMenu.innerHTML = html
    this.attachInspectorEvents(obj)
  }

  attachInspectorEvents(obj) {
    const closeBtn = this.popoverMenu.querySelector('#ctx-close-btn')
    closeBtn?.addEventListener('click', () => this.closePopover())

    // --- EVENTOS DE COLOR DE RELLENO Y BORDE ---
    const fillChips = this.popoverMenu.querySelectorAll('.nbi-context-colors .nbi-color-chip')
    fillChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const color = chip.getAttribute('data-color')
        fillChips.forEach((c) => c.classList.remove('is-active'))
        chip.classList.add('is-active')

        if (obj.type === 'group' || obj.getObjects) {
          this.canvasManager.colorSVGGroup(obj, color)
        } else {
          obj.set('fill', color)
        }
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })
    })

    const strokeChips = this.popoverMenu.querySelectorAll(
      '.nbi-context-stroke-colors .nbi-color-chip'
    )
    strokeChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const color = chip.getAttribute('data-color')
        strokeChips.forEach((c) => c.classList.remove('is-active'))
        chip.classList.add('is-active')
        obj.set('stroke', color)
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })
    })

    const strokeWidthInput = this.popoverMenu.querySelector('#ctx-stroke-width')
    const strokeValDisplay = this.popoverMenu.querySelector('#ctx-stroke-val')
    strokeWidthInput?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10)
      if (strokeValDisplay) strokeValDisplay.textContent = `${val}px`
      obj.set('strokeWidth', val)
      this.canvas.requestRenderAll()
      this.canvas.fire('object:modified')
    })

    // --- EVENTOS DE TEXTO ---
    if (obj.type === 'textbox') {
      const boldBtn = this.popoverMenu.querySelector('#ctx-txt-bold')
      boldBtn?.addEventListener('click', () => {
        const val = obj.fontWeight === 'bold' ? 'normal' : 'bold'
        obj.set('fontWeight', val)
        boldBtn.classList.toggle('is-active', val === 'bold')
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })

      const italicBtn = this.popoverMenu.querySelector('#ctx-txt-italic')
      italicBtn?.addEventListener('click', () => {
        const val = obj.fontStyle === 'italic' ? 'normal' : 'italic'
        obj.set('fontStyle', val)
        italicBtn.classList.toggle('is-active', val === 'italic')
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })

      const alignments = ['left', 'center', 'right']
      alignments.forEach((align) => {
        const btn = this.popoverMenu.querySelector(`#ctx-txt-${align}`)
        btn?.addEventListener('click', () => {
          obj.set('textAlign', align)
          alignments.forEach((a) => {
            this.popoverMenu.querySelector(`#ctx-txt-${a}`)?.classList.remove('is-active')
          })
          btn.classList.add('is-active')
          this.canvas.requestRenderAll()
          this.canvas.fire('object:modified')
        })
      })
    }

    // --- EVENTOS DE IMAGEN ---
    if (obj.type === 'image' && obj !== this.canvasManager.currentMapImage) {
      const flipXBtn = this.popoverMenu.querySelector('#ctx-img-flip-x')
      flipXBtn?.addEventListener('click', () => {
        const val = !obj.flipX
        obj.set('flipX', val)
        flipXBtn.classList.toggle('is-active', val)
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })

      const flipYBtn = this.popoverMenu.querySelector('#ctx-img-flip-y')
      flipYBtn?.addEventListener('click', () => {
        const val = !obj.flipY
        obj.set('flipY', val)
        flipYBtn.classList.toggle('is-active', val)
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })

      const lockBtn = this.popoverMenu.querySelector('#ctx-img-lock')
      lockBtn?.addEventListener('click', () => {
        const val = !obj.lockMovementX
        obj.set({
          lockMovementX: val,
          lockMovementY: val,
          lockRotation: val,
          lockScalingX: val,
          lockScalingY: val,
        })
        lockBtn.classList.toggle('is-active', val)
        const icon = lockBtn.querySelector('i')
        if (icon) icon.setAttribute('data-lucide', val ? 'lock' : 'unlock')
        if (window.lucide) window.lucide.createIcons()
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })

      const grayscaleBtn = this.popoverMenu.querySelector('#ctx-img-grayscale')
      grayscaleBtn?.addEventListener('click', () => {
        const active = !this.canvasManager.hasFilter(obj, 'grayscale')
        grayscaleBtn.classList.toggle('is-active', active)
        this.canvasManager.applyFilter(obj, 'grayscale', active)
      })

      const invertBtn = this.popoverMenu.querySelector('#ctx-img-invert')
      invertBtn?.addEventListener('click', () => {
        const active = !this.canvasManager.hasFilter(obj, 'invert')
        invertBtn.classList.toggle('is-active', active)
        this.canvasManager.applyFilter(obj, 'invert', active)
      })

      const sepiaBtn = this.popoverMenu.querySelector('#ctx-img-sepia')
      sepiaBtn?.addEventListener('click', () => {
        const active = !this.canvasManager.hasFilter(obj, 'sepia')
        sepiaBtn.classList.toggle('is-active', active)
        this.canvasManager.applyFilter(obj, 'sepia', active)
      })
    }

    // --- ACCIONES GENERALES ---
    this.popoverMenu.querySelector('#ctx-act-front')?.addEventListener('click', () => {
      this.canvasManager.bringToFront()
    })

    this.popoverMenu.querySelector('#ctx-act-back')?.addEventListener('click', () => {
      this.canvasManager.sendToBack()
    })

    this.popoverMenu.querySelector('#ctx-act-delete')?.addEventListener('click', () => {
      this.canvasManager.deleteSelected()
      this.closePopover()
    })

    if (window.lucide) {
      window.lucide.createIcons()
    }
  }
}
