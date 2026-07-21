import { Textbox, Rect, Circle, Path, Group, FabricImage, filters } from 'fabric'

export class ContextMenu {
  constructor(canvasManager) {
    if (!canvasManager || !canvasManager.container) {
      throw new TypeError('ContextMenu requiere una instancia válida de CanvasManager')
    }

    this.canvasManager = canvasManager
    this.container = canvasManager.container
    this.canvas = canvasManager.canvas

    this.triggerBtn = null
    this.popoverMenu = null
    this.isOpen = false
    this.presetColors = [
      '#FAEB8B', '#82D3F8', '#7ABE7D', '#E5828C', '#CC94D6',
      '#FFA07A', '#FFD700', '#98FB98', '#AFEEEE', '#FFB6C1',
      '#B0C4DE', '#E6E6FA', '#FFA500', '#FFFFFF', '#000000',
    ]

    this.init()
  }

  init() {
    this.createDOM()
    this.setupCanvasEvents()
  }

  createDOM() {
    // 1. Botón disparador flotante
    this.triggerBtn = document.createElement('button')
    this.triggerBtn.className = 'nbi-btn nbi-context-trigger hidden'
    this.triggerBtn.setAttribute('title', 'Opciones de la figura')
    this.triggerBtn.setAttribute('aria-label', 'Abrir opciones de la figura seleccionada')
    this.triggerBtn.innerHTML = `<i data-lucide="sliders"></i>`
    this.container.appendChild(this.triggerBtn)

    // 2. Menu Popover emergente
    this.popoverMenu = document.createElement('div')
    this.popoverMenu.className = 'nbi-window-floating nbi-context-popover hidden'
    this.container.appendChild(this.popoverMenu)

    // Listener para abrir/cerrar el popover al presionar el disparador
    this.triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.togglePopover()
    })

    // Ocultar popover si se hace clic fuera del menú
    document.addEventListener('click', (e) => {
      if (
        this.isOpen &&
        !this.popoverMenu.contains(e.target) &&
        !this.triggerBtn.contains(e.target)
      ) {
        this.closePopover()
      }
    })
  }

  setupCanvasEvents() {
    if (!this.canvasManager.canvas) {
      setTimeout(() => this.setupCanvasEvents(), 200)
      return
    }

    this.canvas = this.canvasManager.canvas

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

    // Ajustar límites para que no salga de la pantalla
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
    if (!activeObj || !this.popoverMenu) return

    const bound = activeObj.getBoundingRect()
    const containerRect = this.container.getBoundingClientRect()

    let left = bound.left + bound.width + 60
    let top = bound.top - 10

    // Ajustar horizontalmente si desborda la derecha
    if (left + 280 > containerRect.width) {
      left = bound.left - 290
    }

    // Ajustar si aún desborda la izquierda
    if (left < 10) {
      left = Math.max(10, containerRect.width - 290)
    }

    // Ajustar verticalmente
    if (top + 360 > containerRect.height) {
      top = containerRect.height - 370
    }
    if (top < 10) {
      top = 10
    }

    this.popoverMenu.style.left = `${left}px`
    this.popoverMenu.style.top = `${top}px`
  }

  togglePopover() {
    if (this.isOpen) {
      this.closePopover()
    } else {
      this.openPopover()
    }
  }

  openPopover() {
    const activeObj = this.canvas.getActiveObject()
    if (!activeObj || activeObj === this.canvasManager.currentMapImage) return

    this.isOpen = true
    this.renderInspectorControls(activeObj)
    this.updatePopoverPosition(activeObj)
    this.popoverMenu.classList.remove('hidden')

    if (window.lucide) {
      window.lucide.createIcons()
    }
  }

  closePopover() {
    this.isOpen = false
    if (this.popoverMenu) {
      this.popoverMenu.classList.add('hidden')
    }
  }

  hideAll() {
    this.isOpen = false
    if (this.triggerBtn) this.triggerBtn.classList.add('hidden')
    if (this.popoverMenu) this.popoverMenu.classList.add('hidden')
  }

  getObjectTypeLabel(obj) {
    if (obj instanceof Textbox) return 'Texto'
    if (obj instanceof Rect) return 'Rectángulo'
    if (obj instanceof Circle) return 'Círculo'
    if (obj instanceof FabricImage && obj !== this.canvasManager.currentMapImage) return 'Imagen'
    if (obj instanceof Path) {
      const pathData = obj.path ? obj.path.toString() : ''
      if (pathData.includes('C -12 -13') || pathData.includes('M 0 0 C -12')) return 'Marcador'
      if (pathData.includes('M') && pathData.includes('L')) return 'Flecha / Trazo'
      return 'Trazado'
    }
    if (obj instanceof Group) return 'Sticker'
    return 'Figura'
  }

  hasFilter(obj, filterClass) {
    if (!obj.filters || !Array.isArray(obj.filters)) return false
    return obj.filters.some(f => f instanceof filterClass)
  }

  getFilterVal(obj, filterClass, propName, defaultVal = 0) {
    if (!obj.filters || !Array.isArray(obj.filters)) return defaultVal
    const f = obj.filters.find(f => f instanceof filterClass)
    return f && f[propName] !== undefined ? f[propName] : defaultVal
  }

  renderInspectorControls(obj) {
    const label = this.getObjectTypeLabel(obj)
    const isText = obj instanceof Textbox
    const isRect = obj instanceof Rect
    const isImage = obj instanceof FabricImage && obj !== this.canvasManager.currentMapImage
    const hasFill = obj.fill !== undefined && obj.fill !== null && !(obj instanceof Path && obj.fill === 'transparent') && !isImage

    let html = `
      <div class="nbi-context-header">
        <span class="nbi-badge">${label}</span>
        <button class="nbi-btn nbi-btn-close-popover" id="ctx-close-btn" title="Cerrar opciones">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="nbi-context-body">
    `

    // --- SECCIÓN DE IMAGEN (FILTROS Y TRANSFORMACIONES) ---
    if (isImage) {
      const hasGrayscale = this.hasFilter(obj, filters.Grayscale)
      const hasInvert = this.hasFilter(obj, filters.Invert)
      const hasSepia = this.hasFilter(obj, filters.Sepia)

      const brightnessVal = Math.round(this.getFilterVal(obj, filters.Brightness, 'brightness', 0) * 100)
      const contrastVal = Math.round(this.getFilterVal(obj, filters.Contrast, 'contrast', 0) * 100)
      const blurVal = Math.round(this.getFilterVal(obj, filters.Blur, 'blur', 0) * 100)

      const isLocked = !!obj.lockMovementX

      html += `
        <div class="nbi-context-section">
          <span class="nbi-context-label">Volteo y Bloqueo:</span>
          <div style="display: flex; gap: 6px;">
            <button class="nbi-btn nbi-btn-sm ${obj.flipX ? 'is-active' : ''}" id="ctx-img-flip-x" title="Volteo Horizontal">↔ Horiz</button>
            <button class="nbi-btn nbi-btn-sm ${obj.flipY ? 'is-active' : ''}" id="ctx-img-flip-y" title="Volteo Vertical">↕ Vert</button>
            <button class="nbi-btn nbi-btn-sm ${isLocked ? 'is-active' : ''}" id="ctx-img-lock" title="Bloquear transformación"><i data-lucide="${isLocked ? 'lock' : 'unlock'}"></i></button>
          </div>
        </div>

        <div class="nbi-context-section">
          <span class="nbi-context-label">Filtros de Color:</span>
          <div style="display: flex; gap: 6px;">
            <button class="nbi-btn nbi-btn-sm ${hasGrayscale ? 'is-active' : ''}" id="ctx-img-grayscale">Grises</button>
            <button class="nbi-btn nbi-btn-sm ${hasInvert ? 'is-active' : ''}" id="ctx-img-invert">Invertir</button>
            <button class="nbi-btn nbi-btn-sm ${hasSepia ? 'is-active' : ''}" id="ctx-img-sepia">Sepia</button>
          </div>
        </div>

        <div class="nbi-context-section">
          <div style="display: flex; justify-content: space-between;">
            <span class="nbi-context-label">Brillo:</span>
            <span style="font-weight: 700; font-size: 0.85rem;" id="ctx-brightness-val">${brightnessVal}%</span>
          </div>
          <input class="nbi-slider" id="ctx-img-brightness" type="range" min="-100" max="100" value="${brightnessVal}" />
        </div>

        <div class="nbi-context-section">
          <div style="display: flex; justify-content: space-between;">
            <span class="nbi-context-label">Contraste:</span>
            <span style="font-weight: 700; font-size: 0.85rem;" id="ctx-contrast-val">${contrastVal}%</span>
          </div>
          <input class="nbi-slider" id="ctx-img-contrast" type="range" min="-100" max="100" value="${contrastVal}" />
        </div>

        <div class="nbi-context-section">
          <div style="display: flex; justify-content: space-between;">
            <span class="nbi-context-label">Desenfoque:</span>
            <span style="font-weight: 700; font-size: 0.85rem;" id="ctx-blur-val">${blurVal}%</span>
          </div>
          <input class="nbi-slider" id="ctx-img-blur" type="range" min="0" max="100" value="${blurVal}" />
        </div>
      `
    }

    // --- SECCIÓN DE TEXTO ---
    if (isText) {
      const currentText = obj.text || ''
      const currentFont = obj.fontFamily || 'Fredoka'
      const currentSize = obj.fontSize || 24
      const isBold = obj.fontWeight === 'bold'
      const isItalic = obj.fontStyle === 'italic'
      const isUnderline = !!obj.underline
      const align = obj.textAlign || 'left'

      html += `
        <div class="nbi-context-section">
          <span class="nbi-context-label">Contenido:</span>
          <textarea class="nbi-input nbi-context-textarea" id="ctx-text-content" rows="2">${currentText}</textarea>
        </div>

        <div class="nbi-context-section">
          <span class="nbi-context-label">Fuente y Tamaño:</span>
          <div style="display: flex; gap: 8px;">
            <select class="nbi-input" id="ctx-font-family" style="flex: 1; padding: 6px 10px;">
              <option value="Fredoka" ${currentFont === 'Fredoka' ? 'selected' : ''}>Fredoka</option>
              <option value="Roboto" ${currentFont === 'Roboto' ? 'selected' : ''}>Roboto</option>
              <option value="Caveat" ${currentFont === 'Caveat' ? 'selected' : ''}>Caveat</option>
              <option value="Arial" ${currentFont === 'Arial' ? 'selected' : ''}>Arial</option>
              <option value="Georgia" ${currentFont === 'Georgia' ? 'selected' : ''}>Georgia</option>
              <option value="Comic Sans MS" ${currentFont === 'Comic Sans MS' ? 'selected' : ''}>Comic Sans</option>
            </select>
            <span style="font-weight: 700; font-size: 0.9rem; align-self: center;" id="ctx-size-val">${currentSize}px</span>
          </div>
          <input class="nbi-slider" id="ctx-font-size" type="range" min="12" max="72" value="${currentSize}" style="margin-top: 6px;" />
        </div>

        <div class="nbi-context-section">
          <span class="nbi-context-label">Estilo y Alineación:</span>
          <div style="display: flex; justify-content: space-between; gap: 6px;">
            <div style="display: flex; gap: 4px;">
              <button class="nbi-btn nbi-btn-sm ${isBold ? 'is-active' : ''}" id="ctx-btn-bold" title="Negrita"><b>B</b></button>
              <button class="nbi-btn nbi-btn-sm ${isItalic ? 'is-active' : ''}" id="ctx-btn-italic" title="Cursiva"><i>I</i></button>
              <button class="nbi-btn nbi-btn-sm ${isUnderline ? 'is-active' : ''}" id="ctx-btn-underline" title="Subrayado"><u>U</u></button>
            </div>
            <div style="display: flex; gap: 4px;">
              <button class="nbi-btn nbi-btn-sm ${align === 'left' ? 'is-active' : ''}" id="ctx-align-left" title="Izquierda"><i data-lucide="align-left"></i></button>
              <button class="nbi-btn nbi-btn-sm ${align === 'center' ? 'is-active' : ''}" id="ctx-align-center" title="Centro"><i data-lucide="align-center"></i></button>
              <button class="nbi-btn nbi-btn-sm ${align === 'right' ? 'is-active' : ''}" id="ctx-align-right" title="Derecha"><i data-lucide="align-right"></i></button>
            </div>
          </div>
        </div>
      `
    }

    // --- SECCIÓN DE COLOR DE RELLENO ---
    if (hasFill) {
      const currentFill = (obj.fill && obj.fill !== 'transparent') ? obj.fill : '#FAEB8B'
      const isTransparent = obj.fill === 'transparent' || obj.fill === ''

      html += `
        <div class="nbi-context-section">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="nbi-context-label">Relleno:</span>
            ${isRect || obj instanceof Circle ? `
              <label style="font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 4px; cursor: pointer;">
                <input type="checkbox" id="ctx-fill-transparent" ${isTransparent ? 'checked' : ''} />
                Sin relleno
              </label>
            ` : ''}
          </div>
          <div class="nbi-context-colors-grid" id="ctx-fill-chips">
            ${this.presetColors.map(c => `
              <div class="nbi-color-chip ${c.toLowerCase() === (currentFill || '').toLowerCase() && !isTransparent ? 'is-active' : ''}" 
                   style="background-color: ${c}; width: 26px; height: 26px;" data-color="${c}"></div>
            `).join('')}
            <input type="color" id="ctx-fill-picker" class="nbi-color-picker-input" value="${currentFill}" style="width: 32px; height: 26px;" title="Color personalizado" />
          </div>
        </div>
      `
    }

    // --- SECCIÓN DE COLOR DE BORDE ---
    if (obj.stroke !== undefined && !isImage) {
      const currentStroke = obj.stroke || '#000000'

      html += `
        <div class="nbi-context-section">
          <span class="nbi-context-label">Borde / Trazo:</span>
          <div class="nbi-context-colors-grid" id="ctx-stroke-chips">
            ${this.presetColors.map(c => `
              <div class="nbi-color-chip ${c.toLowerCase() === currentStroke.toLowerCase() ? 'is-active' : ''}" 
                   style="background-color: ${c}; width: 26px; height: 26px;" data-color="${c}"></div>
            `).join('')}
            <input type="color" id="ctx-stroke-picker" class="nbi-color-picker-input" value="${currentStroke}" style="width: 32px; height: 26px;" title="Color de borde" />
          </div>
        </div>
      `
    }

    // --- SECCIÓN DE GROSOR Y ESTILO DE TRAZO ---
    if (obj.strokeWidth !== undefined && !isImage) {
      const currentWidth = obj.strokeWidth || 2
      const currentDash = obj.strokeDashArray

      let dashType = 'solid'
      if (Array.isArray(currentDash) && currentDash.length > 0) {
        dashType = currentDash[0] <= 4 ? 'dotted' : 'dashed'
      }

      html += `
        <div class="nbi-context-section">
          <div style="display: flex; justify-content: space-between;">
            <span class="nbi-context-label">Grosor de Trazo:</span>
            <span style="font-weight: 700; font-size: 0.85rem;" id="ctx-stroke-val">${currentWidth}px</span>
          </div>
          <input class="nbi-slider" id="ctx-stroke-width" type="range" min="1" max="30" value="${currentWidth}" />
        </div>

        <div class="nbi-context-section">
          <span class="nbi-context-label">Estilo de Línea:</span>
          <div class="nbi-filter-group">
            <button class="nbi-filter-btn ${dashType === 'solid' ? 'is-active' : ''}" id="ctx-dash-solid">Sólido</button>
            <button class="nbi-filter-btn ${dashType === 'dashed' ? 'is-active' : ''}" id="ctx-dash-dashed">Guiones</button>
            <button class="nbi-filter-btn ${dashType === 'dotted' ? 'is-active' : ''}" id="ctx-dash-dotted">Puntos</button>
          </div>
        </div>
      `
    }

    // --- SECCIÓN DE ESQUINAS REDONDEADAS (RECTÁNGULO) ---
    if (isRect) {
      const currentRx = obj.rx || 0
      html += `
        <div class="nbi-context-section">
          <div style="display: flex; justify-content: space-between;">
            <span class="nbi-context-label">Esquinas Redondeadas:</span>
            <span style="font-weight: 700; font-size: 0.85rem;" id="ctx-rx-val">${currentRx}px</span>
          </div>
          <input class="nbi-slider" id="ctx-corner-rx" type="range" min="0" max="40" value="${currentRx}" />
        </div>
      `
    }

    // --- SECCIÓN DE OPACIDAD ---
    const currentOpacity = Math.round((obj.opacity !== undefined ? obj.opacity : 1) * 100)
    html += `
      <div class="nbi-context-section">
        <div style="display: flex; justify-content: space-between;">
          <span class="nbi-context-label">Opacidad:</span>
          <span style="font-weight: 700; font-size: 0.85rem;" id="ctx-opacity-val">${currentOpacity}%</span>
        </div>
        <input class="nbi-slider" id="ctx-opacity-slider" type="range" min="10" max="100" value="${currentOpacity}" />
      </div>
    `

    // --- SECCIÓN DE ACCIONES RÁPIDAS ---
    html += `
      <div class="nbi-context-actions">
        <button class="nbi-btn nbi-btn-sm" id="ctx-act-duplicate" title="Clonar objeto">
          <i data-lucide="copy"></i> Clonar
        </button>
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

  applyImageFilter(obj, filterType, enabledOrVal) {
    obj.filters = obj.filters || []

    obj.filters = obj.filters.filter((f) => {
      if (filterType === 'grayscale') return !(f instanceof filters.Grayscale)
      if (filterType === 'invert') return !(f instanceof filters.Invert)
      if (filterType === 'sepia') return !(f instanceof filters.Sepia)
      if (filterType === 'brightness') return !(f instanceof filters.Brightness)
      if (filterType === 'contrast') return !(f instanceof filters.Contrast)
      if (filterType === 'blur') return !(f instanceof filters.Blur)
      return true
    })

    if (filterType === 'grayscale' && enabledOrVal) {
      obj.filters.push(new filters.Grayscale())
    } else if (filterType === 'invert' && enabledOrVal) {
      obj.filters.push(new filters.Invert())
    } else if (filterType === 'sepia' && enabledOrVal) {
      obj.filters.push(new filters.Sepia())
    } else if (filterType === 'brightness' && enabledOrVal !== 0) {
      obj.filters.push(new filters.Brightness({ brightness: enabledOrVal }))
    } else if (filterType === 'contrast' && enabledOrVal !== 0) {
      obj.filters.push(new filters.Contrast({ contrast: enabledOrVal }))
    } else if (filterType === 'blur' && enabledOrVal > 0) {
      obj.filters.push(new filters.Blur({ blur: enabledOrVal }))
    }

    obj.applyFilters()
    this.canvas.requestRenderAll()
    this.canvas.fire('object:modified')
  }

  attachInspectorEvents(obj) {
    // Botón de cerrar
    const closeBtn = this.popoverMenu.querySelector('#ctx-close-btn')
    closeBtn?.addEventListener('click', () => this.closePopover())

    // --- EVENTOS DE IMAGEN ---
    const isImage = obj instanceof FabricImage && obj !== this.canvasManager.currentMapImage
    if (isImage) {
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
        const active = !this.hasFilter(obj, filters.Grayscale)
        grayscaleBtn.classList.toggle('is-active', active)
        this.applyImageFilter(obj, 'grayscale', active)
      })

      const invertBtn = this.popoverMenu.querySelector('#ctx-img-invert')
      invertBtn?.addEventListener('click', () => {
        const active = !this.hasFilter(obj, filters.Invert)
        invertBtn.classList.toggle('is-active', active)
        this.applyImageFilter(obj, 'invert', active)
      })

      const sepiaBtn = this.popoverMenu.querySelector('#ctx-img-sepia')
      sepiaBtn?.addEventListener('click', () => {
        const active = !this.hasFilter(obj, filters.Sepia)
        sepiaBtn.classList.toggle('is-active', active)
        this.applyImageFilter(obj, 'sepia', active)
      })

      const brightnessSlider = this.popoverMenu.querySelector('#ctx-img-brightness')
      const brightnessValText = this.popoverMenu.querySelector('#ctx-brightness-val')
      brightnessSlider?.addEventListener('input', (e) => {
        const pct = parseInt(e.target.value, 10)
        if (brightnessValText) brightnessValText.textContent = `${pct}%`
        this.applyImageFilter(obj, 'brightness', pct / 100)
      })

      const contrastSlider = this.popoverMenu.querySelector('#ctx-img-contrast')
      const contrastValText = this.popoverMenu.querySelector('#ctx-contrast-val')
      contrastSlider?.addEventListener('input', (e) => {
        const pct = parseInt(e.target.value, 10)
        if (contrastValText) contrastValText.textContent = `${pct}%`
        this.applyImageFilter(obj, 'contrast', pct / 100)
      })

      const blurSlider = this.popoverMenu.querySelector('#ctx-img-blur')
      const blurValText = this.popoverMenu.querySelector('#ctx-blur-val')
      blurSlider?.addEventListener('input', (e) => {
        const pct = parseInt(e.target.value, 10)
        if (blurValText) blurValText.textContent = `${pct}%`
        this.applyImageFilter(obj, 'blur', pct / 100)
      })
    }

    // --- EVENTOS DE TEXTO ---
    const textInput = this.popoverMenu.querySelector('#ctx-text-content')
    if (textInput) {
      textInput.addEventListener('input', (e) => {
        obj.set('text', e.target.value)
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })
    }

    const fontFamilySelect = this.popoverMenu.querySelector('#ctx-font-family')
    if (fontFamilySelect) {
      fontFamilySelect.addEventListener('change', (e) => {
        obj.set('fontFamily', e.target.value)
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })
    }

    const fontSizeSlider = this.popoverMenu.querySelector('#ctx-font-size')
    const sizeVal = this.popoverMenu.querySelector('#ctx-size-val')
    if (fontSizeSlider) {
      fontSizeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10)
        sizeVal.textContent = `${val}px`
        obj.set('fontSize', val)
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })
    }

    const btnBold = this.popoverMenu.querySelector('#ctx-btn-bold')
    btnBold?.addEventListener('click', () => {
      const isBold = obj.fontWeight === 'bold'
      obj.set('fontWeight', isBold ? 'normal' : 'bold')
      btnBold.classList.toggle('is-active', !isBold)
      this.canvas.requestRenderAll()
      this.canvas.fire('object:modified')
    })

    const btnItalic = this.popoverMenu.querySelector('#ctx-btn-italic')
    btnItalic?.addEventListener('click', () => {
      const isItalic = obj.fontStyle === 'italic'
      obj.set('fontStyle', isItalic ? 'normal' : 'italic')
      btnItalic.classList.toggle('is-active', !isItalic)
      this.canvas.requestRenderAll()
      this.canvas.fire('object:modified')
    })

    const btnUnderline = this.popoverMenu.querySelector('#ctx-btn-underline')
    btnUnderline?.addEventListener('click', () => {
      const isUnderline = !obj.underline
      obj.set('underline', isUnderline)
      btnUnderline.classList.toggle('is-active', isUnderline)
      this.canvas.requestRenderAll()
      this.canvas.fire('object:modified')
    })

    ;['left', 'center', 'right'].forEach((align) => {
      const alignBtn = this.popoverMenu.querySelector(`#ctx-align-${align}`)
      alignBtn?.addEventListener('click', () => {
        ;['left', 'center', 'right'].forEach(a => {
          const b = this.popoverMenu.querySelector(`#ctx-align-${a}`)
          if (b) b.classList.remove('is-active')
        })
        alignBtn.classList.add('is-active')
        obj.set('textAlign', align)
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })
    })

    // --- EVENTOS DE COLOR DE RELLENO ---
    const fillChipsContainer = this.popoverMenu.querySelector('#ctx-fill-chips')
    const fillTransparentCb = this.popoverMenu.querySelector('#ctx-fill-transparent')

    fillChipsContainer?.querySelectorAll('.nbi-color-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const color = chip.getAttribute('data-color')
        fillChipsContainer.querySelectorAll('.nbi-color-chip').forEach(c => c.classList.remove('is-active'))
        chip.classList.add('is-active')
        if (fillTransparentCb) fillTransparentCb.checked = false

        if (obj instanceof Group || obj.getObjects) {
          this.canvasManager.colorSVGGroup(obj, color)
        } else {
          obj.set('fill', color)
        }
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })
    })

    const fillPicker = this.popoverMenu.querySelector('#ctx-fill-picker')
    fillPicker?.addEventListener('change', (e) => {
      const color = e.target.value
      fillChipsContainer.querySelectorAll('.nbi-color-chip').forEach(c => c.classList.remove('is-active'))
      if (fillTransparentCb) fillTransparentCb.checked = false

      if (obj instanceof Group || obj.getObjects) {
        this.canvasManager.colorSVGGroup(obj, color)
      } else {
        obj.set('fill', color)
      }
      this.canvas.requestRenderAll()
      this.canvas.fire('object:modified')
    })

    fillTransparentCb?.addEventListener('change', (e) => {
      if (e.target.checked) {
        fillChipsContainer.querySelectorAll('.nbi-color-chip').forEach(c => c.classList.remove('is-active'))
        obj.set('fill', 'transparent')
      } else {
        const defaultColor = this.canvasManager.activeColor || '#FAEB8B'
        obj.set('fill', defaultColor)
      }
      this.canvas.requestRenderAll()
      this.canvas.fire('object:modified')
    })

    // --- EVENTOS DE COLOR DE BORDE ---
    const strokeChipsContainer = this.popoverMenu.querySelector('#ctx-stroke-chips')
    strokeChipsContainer?.querySelectorAll('.nbi-color-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const color = chip.getAttribute('data-color')
        strokeChipsContainer.querySelectorAll('.nbi-color-chip').forEach(c => c.classList.remove('is-active'))
        chip.classList.add('is-active')

        obj.set('stroke', color)
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      })
    })

    const strokePicker = this.popoverMenu.querySelector('#ctx-stroke-picker')
    strokePicker?.addEventListener('change', (e) => {
      const color = e.target.value
      strokeChipsContainer.querySelectorAll('.nbi-color-chip').forEach(c => c.classList.remove('is-active'))

      obj.set('stroke', color)
      this.canvas.requestRenderAll()
      this.canvas.fire('object:modified')
    })

    // --- EVENTO DE GROSOR DE TRAZO ---
    const strokeWidthSlider = this.popoverMenu.querySelector('#ctx-stroke-width')
    const strokeValText = this.popoverMenu.querySelector('#ctx-stroke-val')
    strokeWidthSlider?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10)
      if (strokeValText) strokeValText.textContent = `${val}px`
      obj.set('strokeWidth', val)
      this.canvas.requestRenderAll()
      this.canvas.fire('object:modified')
    })

    // --- EVENTO DE ESTILO DE TRAZO (LÍNEA) ---
    const dashSolid = this.popoverMenu.querySelector('#ctx-dash-solid')
    const dashDashed = this.popoverMenu.querySelector('#ctx-dash-dashed')
    const dashDotted = this.popoverMenu.querySelector('#ctx-dash-dotted')

    const updateDashButtons = (activeBtn) => {
      ;[dashSolid, dashDashed, dashDotted].forEach(b => b?.classList.remove('is-active'))
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
      this.canvas.fire('object:modified')
    })

    // --- ACCIONES RÁPIDAS ---
    this.popoverMenu.querySelector('#ctx-act-duplicate')?.addEventListener('click', () => {
      this.canvasManager.duplicateSelected()
    })

    this.popoverMenu.querySelector('#ctx-act-front')?.addEventListener('click', () => {
      this.canvasManager.bringToFront()
    })

    this.popoverMenu.querySelector('#ctx-act-back')?.addEventListener('click', () => {
      this.canvasManager.sendToBack()
    })

    this.popoverMenu.querySelector('#ctx-act-delete')?.addEventListener('click', () => {
      this.canvasManager.deleteSelected()
      this.hideAll()
    })
  }
}
