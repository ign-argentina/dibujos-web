import { Component } from '../Component.js'

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
      "#FFFFFF", // Blanco
      "#9E9E9E", // Gris
      "#000000", // Negro
      "#F44336", // Rojo
      "#FF9800", // Naranja
      "#FFEB3B", // Amarillo
      "#4CAF50", // Verde
      "#00BCD4", // Cian
      "#2196F3", // Azul
      "#3F51B5", // Índigo
      "#9C27B0", // Violeta
      "#E91E63"  // Rosa
    ];

    this.mount()
  }

  render() {
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
    this.popoverMenu.className = 'nbi-window-floating nbi-context hidden'
    this.popoverMenu.setAttribute('role', 'dialog')
    this.popoverMenu.setAttribute('aria-label', 'Opciones y propiedades de la figura seleccionada')

    this.container.appendChild(this.popoverMenu)
  }

  bindEvents() {
    // Evento de clic en el disparador flotante
    this.addEvent(this.triggerBtn, 'click', (e) => {
      e.stopPropagation()
      this.togglePopover()
    })

    // Evitar que los clics dentro del menú contextual burbujeen hasta el documento
    this.addEvent(this.popoverMenu, 'click', (e) => {
      e.stopPropagation()
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

    // Permitir abrir el menú contextual con clic derecho sobre un objeto
    this.canvas.on('mouse:down', (opt) => {
      const e = opt.e
      const isRightClick = e.button === 2 || e.which === 3
      if (isRightClick) {
        const target = this.canvas.findTarget(opt.e)
        if (target && target !== this.canvasManager.currentMapImage && target.isMapBase !== true) {
          opt.e.preventDefault()
          opt.e.stopPropagation()
          this.canvas.setActiveObject(target)
          this.canvas.requestRenderAll()
          this.updateTriggerPosition(target)
          this.openPopover()
        }
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
    if (obj.type === 'polyline') return 'Polilínea'
    if (obj.type === 'polygon') return 'Polígono libre'
    if (obj.type === 'path') {
      const pathData = obj.path ? obj.path.toString() : ''
      if (pathData.includes('C -12 -13') || pathData.includes('M 0 0 C -12')) return 'Marcador'
      return obj.fill === 'transparent' ? 'Flecha' : 'Dibujo'
    }
    if (obj.type === 'group') return 'Sticker'
    return 'Figura'
  }

  getFilterVal(obj, filterTypeName, propName, defaultVal = 0) {
    if (!obj.filters || !Array.isArray(obj.filters)) return defaultVal
    const f = obj.filters.find((f) => f.type === filterTypeName)
    return f && f[propName] !== undefined ? f[propName] : defaultVal
  }

  buildPopoverContent(obj) {
    const typeName = this.getFriendlyTypeName(obj)
    const isText = obj.type === 'textbox'
    const isImage = obj.type === 'image' && obj !== this.canvasManager.currentMapImage
    const isRect = obj.type === 'rect'
    const isCircle = obj.type === 'circle'
    const isPolyline = obj.type === 'polyline'
    const isPolygon = obj.type === 'polygon'
    const isGroup = obj.type === 'group' || obj.getObjects
    const isPath = obj.type === 'path'
    const isPin = isPath && !(obj.fill === 'transparent' || obj.fill === '')

    const showFillOption = isRect || isCircle || isPolygon || isText || isGroup || isPath || isPin
    const showStrokeOption = isRect || isCircle || isPolyline || isPolygon || isPath

    let contentHtml = ''

    // 1. SECCIÓN DE COLOR DE RELLENO
    if (showFillOption) {
      const currentFill = obj.fill && obj.fill !== 'transparent' ? obj.fill : '#82D3F8'
      const isTransparent = obj.fill === 'transparent' || obj.fill === ''

      contentHtml += `
        <div class="nbi-context__section">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label class="nbi-context__label">Color de Relleno</label>
            ${(isRect || isCircle || isPolygon || isPath) ? `
              <label class="nbi-context__checkbox-label">
                <input type="checkbox" id="ctx-fill-transparent" ${isTransparent ? 'checked' : ''} />
                Sin relleno
              </label>
            ` : ''}
          </div>
          <div class="nbi-context__colors">
      `
      this.presetColors.forEach((color) => {
        const isSelected = (obj.fill || '').toUpperCase() === color.toUpperCase() && !isTransparent
        contentHtml += `
          <button class="nbi-color-chip ${isSelected ? 'is-active' : ''}" 
                  style="background-color: ${color};" 
                  data-color="${color}" 
                  aria-label="Color ${color}"></button>
        `
      })
      contentHtml += `
          </div>
          <div style="display: flex; flex-direction: row; gap: 6px; margin-top: 6px; align-items: center;">
            <label for="ctx-fill-picker" style="font-weight: var(--nbi-font-weight-semibold); font-size: var(--nbi-font-size-sm); display: flex; align-items: center; gap: 4px; cursor: pointer; margin: 0;">
              <i data-lucide="palette" style="width: 14px; height: 14px;" aria-hidden="true"></i>
              Más colores:
            </label>
            <input type="color" id="ctx-fill-picker" class="nbi-color-picker" value="${currentFill}" title="Color personalizado" />
          </div>
        </div>
      `
    }

    // 2. SECCIÓN DE COLOR DE BORDE / ESTILO DE LÍNEA
    if (showStrokeOption) {
      const currentStroke = obj.stroke || '#000000'
      const currentWidth = obj.strokeWidth || 2
      const currentDash = obj.strokeDashArray

      let dashType = 'solid'
      if (Array.isArray(currentDash) && currentDash.length > 0) {
        dashType = currentDash[0] <= 4 ? 'dotted' : 'dashed'
      }

      contentHtml += `
        <div class="nbi-context__section">
          <label class="nbi-context__label">Color del Borde</label>
          <div class="nbi-context__stroke-colors">
      `
      this.presetColors.forEach((color) => {
        const isSelected = (obj.stroke || '').toUpperCase() === color.toUpperCase()
        contentHtml += `
          <button class="nbi-color-chip ${isSelected ? 'is-active' : ''}" 
                  style="background-color: ${color};" 
                  data-color="${color}" 
                  data-stroke-color="${color}" 
                  aria-label="Color borde ${color}"></button>
        `
      })
      contentHtml += `
          </div>
          <div style="display: flex; flex-direction: row; gap: 6px; margin-top: 6px; align-items: center;">
            <label for="ctx-stroke-picker" style="font-weight: var(--nbi-font-weight-semibold); font-size: var(--nbi-font-size-sm); display: flex; align-items: center; gap: 4px; cursor: pointer; margin: 0;">
              <i data-lucide="palette" style="width: 14px; height: 14px;" aria-hidden="true"></i>
              Personalizar:
            </label>
            <input type="color" id="ctx-stroke-picker" class="nbi-color-picker" value="${currentStroke}" title="Color de borde personalizado" />
          </div>
        </div>
        <div class="nbi-context__section">
          <div class="nbi-context__stroke-width-group">
            <label for="ctx-stroke-width" class="nbi-context__label">Grosor: <span id="ctx-stroke-val">${currentWidth}px</span></label>
            <input type="range" class="nbi-slider" id="ctx-stroke-width" min="1" max="30" value="${currentWidth}" />
          </div>
        </div>
        <div class="nbi-context__section">
          <label class="nbi-context__label">Estilo de Línea</label>
          <div class="nbi-filter-group">
            <button class="nbi-filter-group__btn ${dashType === 'solid' ? 'is-active' : ''}" id="ctx-dash-solid">Sólido</button>
            <button class="nbi-filter-group__btn ${dashType === 'dashed' ? 'is-active' : ''}" id="ctx-dash-dashed">Guiones</button>
            <button class="nbi-filter-group__btn ${dashType === 'dotted' ? 'is-active' : ''}" id="ctx-dash-dotted">Puntos</button>
          </div>
        </div>
      `
    }

    // 3. SECCIÓN DE ESQUINAS REDONDEADAS (RECTÁNGULO)
    if (isRect) {
      const currentRx = obj.rx || 0
      contentHtml += `
        <div class="nbi-context__section">
          <div style="display: flex; justify-content: space-between;">
            <label for="ctx-corner-rx" class="nbi-context__label">Esquinas Redondeadas:</label>
            <span style="font-weight: var(--nbi-font-weight-semibold); font-size: var(--nbi-font-size-sm);" id="ctx-rx-val">${currentRx}px</span>
          </div>
          <input class="nbi-slider" id="ctx-corner-rx" type="range" min="0" max="40" value="${currentRx}" />
        </div>
      `
    }

    // 4. SECCIÓN DE OPACIDAD
    const currentOpacity = Math.round((obj.opacity !== undefined ? obj.opacity : 1) * 100)
    contentHtml += `
      <div class="nbi-context__section">
        <div style="display: flex; justify-content: space-between;">
          <label for="ctx-opacity-slider" class="nbi-context__label">Opacidad:</label>
          <span style="font-weight: var(--nbi-font-weight-semibold); font-size: var(--nbi-font-size-sm);" id="ctx-opacity-val">${currentOpacity}%</span>
        </div>
        <input class="nbi-slider" id="ctx-opacity-slider" type="range" min="10" max="100" value="${currentOpacity}" />
      </div>
    `

    // 5. SECCIÓN DE TEXTO AVANZADA
    if (isText) {
      const currentText = obj.text || ''
      const currentFont = obj.fontFamily || 'Fredoka'
      const currentSize = obj.fontSize || 24
      const isBold = obj.fontWeight === 'bold'
      const isItalic = obj.fontStyle === 'italic'
      const isUnderline = !!obj.underline
      const align = obj.textAlign || 'left'

      contentHtml += `
        <div class="nbi-context__section">
          <label class="nbi-context__label">Contenido</label>
          <textarea class="nbi-context__textarea" id="ctx-text-content" rows="2">${currentText}</textarea>
        </div>
        <div class="nbi-context__section">
          <label class="nbi-context__label">Familia de Fuente</label>
          <select class="nbi-input" id="ctx-font-family">
            <option value="Fredoka" ${currentFont === 'Fredoka' ? 'selected' : ''}>Fredoka</option>
            <option value="Roboto" ${currentFont === 'Roboto' ? 'selected' : ''}>Roboto</option>
            <option value="Caveat" ${currentFont === 'Caveat' ? 'selected' : ''}>Caveat</option>
            <option value="Arial" ${currentFont === 'Arial' ? 'selected' : ''}>Arial</option>
            <option value="Georgia" ${currentFont === 'Georgia' ? 'selected' : ''}>Georgia</option>
            <option value="Comic Sans MS" ${currentFont === 'Comic Sans MS' ? 'selected' : ''}>Comic Sans</option>
          </select>
        </div>
        <div class="nbi-context__section">
          <div style="display: flex; justify-content: space-between;">
            <label for="ctx-font-size" class="nbi-context__label">Tamaño de Fuente:</label>
            <span style="font-weight: var(--nbi-font-weight-semibold); font-size: var(--nbi-font-size-sm);" id="ctx-size-val">${currentSize}px</span>
          </div>
          <input class="nbi-slider" id="ctx-font-size" type="range" min="12" max="72" value="${currentSize}" />
        </div>
        <div class="nbi-context__section">
          <label class="nbi-context__label">Formato de Texto</label>
          <div class="nbi-context__text-tools">
            <button class="nbi-btn nbi-btn--sm ${isBold ? 'is-active' : ''}" id="ctx-txt-bold" title="Negrita"><b>N</b></button>
            <button class="nbi-btn nbi-btn--sm ${isItalic ? 'is-active' : ''}" id="ctx-txt-italic" title="Cursiva"><i>I</i></button>
            <button class="nbi-btn nbi-btn--sm ${isUnderline ? 'is-active' : ''}" id="ctx-txt-underline" title="Subrayado"><u>U</u></button>
            <div style="flex-grow: 1;"></div>
            <button class="nbi-btn nbi-btn--sm ${align === 'left' ? 'is-active' : ''}" id="ctx-txt-left" title="Alinear Izquierda"><i data-lucide="align-left"></i></button>
            <button class="nbi-btn nbi-btn--sm ${align === 'center' ? 'is-active' : ''}" id="ctx-txt-center" title="Alinear Centro"><i data-lucide="align-center"></i></button>
            <button class="nbi-btn nbi-btn--sm ${align === 'right' ? 'is-active' : ''}" id="ctx-txt-right" title="Alinear Derecha"><i data-lucide="align-right"></i></button>
          </div>
        </div>
      `
    }

    // 6. SECCIÓN DE IMAGEN AVANZADA
    if (isImage) {
      const isFlippedX = obj.flipX
      const isFlippedY = obj.flipY
      const isLocked = obj.lockMovementX

      const hasGrayscale = this.canvasManager.hasFilter(obj, 'grayscale')
      const hasInvert = this.canvasManager.hasFilter(obj, 'invert')
      const hasSepia = this.canvasManager.hasFilter(obj, 'sepia')

      const brightnessVal = Math.round(
        this.getFilterVal(obj, 'Brightness', 'brightness', 0) * 100
      )
      const contrastVal = Math.round(
        this.getFilterVal(obj, 'Contrast', 'contrast', 0) * 100
      )
      const blurVal = Math.round(
        this.getFilterVal(obj, 'Blur', 'blur', 0) * 100
      )

      contentHtml += `
        <div class="nbi-context__section">
          <label class="nbi-context__label">Propiedades de Imagen</label>
          <div class="nbi-context__image-tools">
            <button class="nbi-btn nbi-btn--sm ${isFlippedX ? 'is-active' : ''}" id="ctx-img-flip-x" title="Reflejo Horizontal"><i data-lucide="flip-horizontal"></i> H</button>
            <button class="nbi-btn nbi-btn--sm ${isFlippedY ? 'is-active' : ''}" id="ctx-img-flip-y" title="Reflejo Vertical"><i data-lucide="flip-vertical"></i> V</button>
            <button class="nbi-btn nbi-btn--sm ${isLocked ? 'is-active' : ''}" id="ctx-img-lock" title="Bloquear Posición"><i data-lucide="${isLocked ? 'lock' : 'unlock'}"></i> Fijar</button>
          </div>
        </div>
        <div class="nbi-context__section">
          <label class="nbi-context__label">Filtros de Color</label>
          <div class="nbi-context__filters-grid">
            <button class="nbi-btn nbi-btn--sm ${hasGrayscale ? 'is-active' : ''}" id="ctx-img-grayscale">Grises</button>
            <button class="nbi-btn nbi-btn--sm ${hasInvert ? 'is-active' : ''}" id="ctx-img-invert">Invertir</button>
            <button class="nbi-btn nbi-btn--sm ${hasSepia ? 'is-active' : ''}" id="ctx-img-sepia">Sepia</button>
          </div>
        </div>
        <div class="nbi-context__section">
          <div style="display: flex; justify-content: space-between;">
            <label for="ctx-img-brightness" class="nbi-context__label">Brillo:</label>
            <span style="font-weight: var(--nbi-font-weight-semibold); font-size: var(--nbi-font-size-sm);" id="ctx-brightness-val">${brightnessVal}%</span>
          </div>
          <input class="nbi-slider" id="ctx-img-brightness" type="range" min="-100" max="100" value="${brightnessVal}" />
        </div>
        <div class="nbi-context__section">
          <div style="display: flex; justify-content: space-between;">
            <label for="ctx-img-contrast" class="nbi-context__label">Contraste:</label>
            <span style="font-weight: var(--nbi-font-weight-semibold); font-size: var(--nbi-font-size-sm);" id="ctx-contrast-val">${contrastVal}%</span>
          </div>
          <input class="nbi-slider" id="ctx-img-contrast" type="range" min="-100" max="100" value="${contrastVal}" />
        </div>
        <div class="nbi-context__section">
          <div style="display: flex; justify-content: space-between;">
            <label for="ctx-img-blur" class="nbi-context__label">Desenfoque:</label>
            <span style="font-weight: var(--nbi-font-weight-semibold); font-size: var(--nbi-font-size-sm);" id="ctx-blur-val">${blurVal}%</span>
          </div>
          <input class="nbi-slider" id="ctx-img-blur" type="range" min="0" max="100" value="${blurVal}" />
        </div>
      `
    }

    const html = `
      <div class="nbi-context__header">
        <span class="nbi-context__title">${typeName}</span>
        <button class="nbi-btn nbi-btn--close-popover" id="ctx-close-btn" aria-label="Cerrar opciones"><i data-lucide="x"></i></button>
      </div>
      <div class="nbi-context__body">
        ${contentHtml}
        <div class="nbi-context__actions">
          <button class="nbi-btn nbi-btn--sm" id="ctx-act-duplicate" title="Clonar objeto">
            <i data-lucide="copy"></i> Clonar
          </button>
          <button class="nbi-btn nbi-btn--sm" id="ctx-act-front" title="Traer al frente">
            <i data-lucide="arrow-up"></i> Frente
          </button>
          <button class="nbi-btn nbi-btn--sm" id="ctx-act-back" title="Enviar al fondo">
            <i data-lucide="arrow-down"></i> Fondo
          </button>
          <button class="nbi-btn nbi-btn--sm nbi-btn--danger" id="ctx-act-delete" title="Eliminar figura">
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
    const fillChips = this.popoverMenu.querySelectorAll('.nbi-context__colors .nbi-color-chip')
    fillChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const color = chip.getAttribute('data-color')
        fillChips.forEach((c) => c.classList.remove('is-active'))
        chip.classList.add('is-active')

        const fillTransparentCb = this.popoverMenu.querySelector('#ctx-fill-transparent')
        if (fillTransparentCb) fillTransparentCb.checked = false

        const fillPicker = this.popoverMenu.querySelector('#ctx-fill-picker')
        if (fillPicker) fillPicker.value = color

        if (obj.type === 'group' || obj.getObjects) {
          this.canvasManager.colorSVGGroup(obj, color)
        } else {
          obj.set('fill', color)
        }
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })
    })

    const fillPicker = this.popoverMenu.querySelector('#ctx-fill-picker')
    fillPicker?.addEventListener('input', (e) => {
      const color = e.target.value
      fillChips.forEach((c) => c.classList.remove('is-active'))

      const fillTransparentCb = this.popoverMenu.querySelector('#ctx-fill-transparent')
      if (fillTransparentCb) fillTransparentCb.checked = false

      if (obj.type === 'group' || obj.getObjects) {
        this.canvasManager.colorSVGGroup(obj, color)
      } else {
        obj.set('fill', color)
      }
      this.canvas.requestRenderAll()
    })
    fillPicker?.addEventListener('change', () => {
      this.canvas.fire('object:modified')
    })

    const fillTransparentCb = this.popoverMenu.querySelector('#ctx-fill-transparent')
    fillTransparentCb?.addEventListener('change', (e) => {
      if (e.target.checked) {
        fillChips.forEach((c) => c.classList.remove('is-active'))
        obj.set('fill', 'transparent')
      } else {
        const defaultColor = this.canvasManager.activeColor || '#82D3F8'
        obj.set('fill', defaultColor)
        fillChips.forEach((c) => {
          if (c.getAttribute('data-color').toUpperCase() === defaultColor.toUpperCase()) {
            c.classList.add('is-active')
          }
        })
        if (fillPicker) fillPicker.value = defaultColor
      }
      this.canvas.requestRenderAll()
      this.canvas.fire('object:modified')
    })

    const strokeChips = this.popoverMenu.querySelectorAll('.nbi-context__stroke-colors .nbi-color-chip')
    strokeChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const color = chip.getAttribute('data-color')
        strokeChips.forEach((c) => c.classList.remove('is-active'))
        chip.classList.add('is-active')

        const strokePicker = this.popoverMenu.querySelector('#ctx-stroke-picker')
        if (strokePicker) strokePicker.value = color

        obj.set('stroke', color)
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })
    })

    const strokePicker = this.popoverMenu.querySelector('#ctx-stroke-picker')
    strokePicker?.addEventListener('input', (e) => {
      const color = e.target.value
      strokeChips.forEach((c) => c.classList.remove('is-active'))

      obj.set('stroke', color)
      this.canvas.requestRenderAll()
    })
    strokePicker?.addEventListener('change', () => {
      this.canvas.fire('object:modified')
    })

    const strokeWidthInput = this.popoverMenu.querySelector('#ctx-stroke-width')
    const strokeValDisplay = this.popoverMenu.querySelector('#ctx-stroke-val')
    strokeWidthInput?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10)
      if (strokeValDisplay) strokeValDisplay.textContent = `${val}px`
      obj.set('strokeWidth', val)
      this.canvas.requestRenderAll()
    })
    strokeWidthInput?.addEventListener('change', () => {
      this.canvas.fire('object:modified')
    })

    const dashSolid = this.popoverMenu.querySelector('#ctx-dash-solid')
    const dashDashed = this.popoverMenu.querySelector('#ctx-dash-dashed')
    const dashDotted = this.popoverMenu.querySelector('#ctx-dash-dotted')

    const updateDashButtons = (activeBtn) => {
      [dashSolid, dashDashed, dashDotted].forEach((b) => b?.classList.remove('is-active'))
      activeBtn?.classList.add('is-active')
    }

    dashSolid?.addEventListener('click', () => {
      updateDashButtons(dashSolid)
      obj.set('strokeDashArray', null)
      this.canvas.requestRenderAll()
      this.canvas.fire('object:modified')
    })

    dashDashed?.addEventListener('click', () => {
      updateDashButtons(dashDashed)
      const w = obj.strokeWidth || 4
      obj.set('strokeDashArray', [w * 2, w * 2])
      this.canvas.requestRenderAll()
      this.canvas.fire('object:modified')
    })

    dashDotted?.addEventListener('click', () => {
      updateDashButtons(dashDotted)
      const w = obj.strokeWidth || 4
      obj.set('strokeDashArray', [w, w * 1.5])
      this.canvas.requestRenderAll()
      this.canvas.fire('object:modified')
    })

    // --- EVENTO DE ESQUINAS REDONDEADAS (RX) ---
    const rxSlider = this.popoverMenu.querySelector('#ctx-corner-rx')
    const rxValText = this.popoverMenu.querySelector('#ctx-rx-val')
    rxSlider?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10)
      if (rxValText) rxValText.textContent = `${val}px`
      obj.set({ rx: val, ry: val })
      this.canvas.requestRenderAll()
    })
    rxSlider?.addEventListener('change', () => {
      this.canvas.fire('object:modified')
    })

    // --- EVENTO DE OPACIDAD ---
    const opacitySlider = this.popoverMenu.querySelector('#ctx-opacity-slider')
    const opacityValText = this.popoverMenu.querySelector('#ctx-opacity-val')
    opacitySlider?.addEventListener('input', (e) => {
      const pct = parseInt(e.target.value, 10)
      if (opacityValText) opacityValText.textContent = `${pct}%`
      obj.set('opacity', pct / 100)
      this.canvas.requestRenderAll()
    })
    opacitySlider?.addEventListener('change', () => {
      this.canvas.fire('object:modified')
    })

    // --- EVENTOS DE TEXTO ---
    if (obj.type === 'textbox') {
      const textInput = this.popoverMenu.querySelector('#ctx-text-content')
      textInput?.addEventListener('input', (e) => {
        obj.set('text', e.target.value)
        this.canvas.requestRenderAll()
        this.updateTriggerPosition(obj)
      })
      textInput?.addEventListener('change', () => {
        this.canvas.fire('object:modified')
      })

      const fontFamilySelect = this.popoverMenu.querySelector('#ctx-font-family')
      fontFamilySelect?.addEventListener('change', (e) => {
        obj.set('fontFamily', e.target.value)
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })

      const fontSizeSlider = this.popoverMenu.querySelector('#ctx-font-size')
      const fontSizeValDisplay = this.popoverMenu.querySelector('#ctx-size-val')
      fontSizeSlider?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10)
        if (fontSizeValDisplay) fontSizeValDisplay.textContent = `${val}px`
        obj.set('fontSize', val)
        this.canvas.requestRenderAll()
        this.updateTriggerPosition(obj)
      })
      fontSizeSlider?.addEventListener('change', () => {
        this.canvas.fire('object:modified')
      })

      const underlineBtn = this.popoverMenu.querySelector('#ctx-txt-underline')
      underlineBtn?.addEventListener('click', () => {
        const val = !obj.underline
        obj.set('underline', val)
        underlineBtn.classList.toggle('is-active', val)
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })

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

      const brightnessSlider = this.popoverMenu.querySelector('#ctx-img-brightness')
      const brightnessValText = this.popoverMenu.querySelector('#ctx-brightness-val')
      brightnessSlider?.addEventListener('input', (e) => {
        const pct = parseInt(e.target.value, 10)
        if (brightnessValText) brightnessValText.textContent = `${pct}%`
        this.canvasManager.applyFilter(obj, 'brightness', pct / 100)
      })

      const contrastSlider = this.popoverMenu.querySelector('#ctx-img-contrast')
      const contrastValText = this.popoverMenu.querySelector('#ctx-contrast-val')
      contrastSlider?.addEventListener('input', (e) => {
        const pct = parseInt(e.target.value, 10)
        if (contrastValText) contrastValText.textContent = `${pct}%`
        this.canvasManager.applyFilter(obj, 'contrast', pct / 100)
      })

      const blurSlider = this.popoverMenu.querySelector('#ctx-img-blur')
      const blurValText = this.popoverMenu.querySelector('#ctx-blur-val')
      blurSlider?.addEventListener('input', (e) => {
        const pct = parseInt(e.target.value, 10)
        if (blurValText) blurValText.textContent = `${pct}%`
        this.canvasManager.applyFilter(obj, 'blur', pct / 100)
      })
    }

    // --- ACCIONES GENERALES ---
    this.popoverMenu.querySelector('#ctx-act-duplicate')?.addEventListener('click', () => {
      this.canvasManager.duplicateSelected()
      this.closePopover()
    })

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
