import { FabricImage } from 'fabric'
import { FabricAdapter } from './canvas/FabricAdapter.js'
import { ShapeFactory } from './canvas/ShapeFactory.js'
import { ExportService } from './export/ExportService.js'
import { ToolService } from './canvas/tools/ToolService.js'

import { ResizeManager } from './utils/ResizeManager.js'
import { compressImage } from './utils/imageCompressor.js'
import { HistoryManager } from './canvas/history/HistoryManager.js'
import { Memento } from './canvas/history/Memento.js'

export class CanvasManager {
  constructor(container, options = {}) {
    if (!(container instanceof HTMLElement)) {
      throw new TypeError('CanvasManager espera un contenedor HTML válido')
    }

    this.container = container
    this.options = options
    this.adapter = new FabricAdapter()
    this.canvas = null
    this.canvasEl = null
    this.resizeManager = null
    this.historyManager = new HistoryManager(this)
    this.isRestoringHistory = false

    // Dimensiones en caché para evitar bucles de redimensionamiento
    this.canvasWidth = 0
    this.canvasHeight = 0

    // Almacenamiento para el mapa base y la imagen
    this.currentMapImage = null
    this.currentMapUrl = null

    // Propiedades de herramientas NBI
    this.activeColor = '#000000'
    this.activeStrokeWidth = 4
    this.activeTool = 'pan'
    this.onToolChange = null

    // Estado de dibujo interactivo de figuras
    this.isDrawingShape = false
    this.drawStartPoint = null
    this.previewShape = null

    // Prevenir el menú contextual para permitir arrastrar con botón derecho
    this.container.addEventListener('contextmenu', (e) => {
      e.preventDefault()
    })
  }

  init() {
    this.createCanvasElement()

    this.adapter.init(this.canvasEl, {
      selection: true,
      preserveObjectStacking: true,
      ...this.options,
    })
    this.canvas = this.adapter.canvas

    this.toolService = new ToolService(this)
    this.toolService.setTool(this.activeTool)

    // Configurar listeners de eventos para el historial
    this.canvas.on('object:modified', () => {
      if (!this.isRestoringHistory) {
        this.historyManager.capture()
      }
    })
    this.canvas.on('path:created', () => {
      if (!this.isRestoringHistory) {
        this.historyManager.capture()
      }
    })

    this.configureDrawingBrush()
    this.observeZoomAndPan()
    this.observeResize()
    this.resizeCanvas()
  }

  createCanvasElement() {
    this.canvasEl = document.createElement('canvas')
    this.canvasEl.className = 'fabric-canvas'
    this.canvasEl.setAttribute('tabindex', '0')
    this.canvasEl.setAttribute('role', 'img')
    this.canvasEl.setAttribute(
      'aria-label',
      'Lienzo interactivo de dibujo sobre el mapa. Presioná Delete o Supr para borrar figuras seleccionadas o Escape para deseleccionar.'
    )

    // Escuchador de eventos de teclado en el canvas para accesibilidad
    this.canvasEl.addEventListener('keydown', (e) => {
      if (this.toolService && this.toolService.activeTool && typeof this.toolService.activeTool.onKeyDown === 'function') {
        const handled = this.toolService.activeTool.onKeyDown(e)
        if (handled) {
          e.preventDefault()
          return
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObj = this.canvas?.getActiveObject()
        if (activeObj && !(activeObj.type === 'textbox' && activeObj.isEditing)) {
          e.preventDefault()
          this.deleteSelected()
        }
      } else if (e.key === 'Escape') {
        if (this.canvas) {
          this.canvas.discardActiveObject()
          this.canvas.requestRenderAll()
          this.announceA11y('Selección cancelada')
        }
      }
    })

    this.container.appendChild(this.canvasEl)
  }

  configureDrawingBrush() {
    this.adapter.setBrushOptions(this.activeColor, this.activeStrokeWidth)
  }

  resizeCanvas() {
    if (!this.canvas) return

    const rect = this.container.getBoundingClientRect()
    const width = Math.max(Math.round(rect.width), 0)
    const height = Math.max(Math.round(rect.height), 0)

    if (!width || !height) return

    if (this.canvasWidth !== width || this.canvasHeight !== height) {
      this.canvasWidth = width
      this.canvasHeight = height

      this.adapter.setDimensions({ width, height })
      this.adapter.calcOffset()
      this.adapter.requestRenderAll()

      if (this.currentMapImage) {
        this.fitMapToCanvas()
      }
    }
  }

  observeResize() {
    this.resizeManager = new ResizeManager(() => this.resizeCanvas(), 100)
    this.resizeManager.observe(this.container)
  }

  async loadMap(url) {
    if (!this.canvas) return

    if (this.currentMapImage) {
      this.adapter.removeObject(this.currentMapImage)
      this.currentMapImage = null
    }

    try {
      this.currentMapUrl = url

      const img = await this.adapter.loadBackgroundImage(url)
      this.currentMapImage = img
      this.fitMapToCanvas()

      return img
    } catch (error) {
      console.error('Error cargando el mapa de fondo:', error)
      throw error
    }
  }

  fitMapToCanvas() {
    if (!this.canvas || !this.currentMapImage) return

    const canvasWidth = this.canvasWidth
    const canvasHeight = this.canvasHeight
    const imgWidth = this.currentMapImage.width
    const imgHeight = this.currentMapImage.height

    if (!imgWidth || !imgHeight) return

    const canvasRatio = canvasWidth / canvasHeight
    const imgRatio = imgWidth / imgHeight

    let scale = 1
    if (imgRatio > canvasRatio) {
      scale = canvasWidth / imgWidth
    } else {
      scale = canvasHeight / imgHeight
    }

    const left = (canvasWidth - imgWidth * scale) / 2
    const top = (canvasHeight - imgHeight * scale) / 2

    this.currentMapImage.set({
      scaleX: scale,
      scaleY: scale,
      left: left,
      top: top,
    })

    const zoom = 0.8
    const xOffset = (canvasWidth - canvasWidth * zoom) / 2
    const yOffset = (canvasHeight - canvasHeight * zoom) / 2

    this.adapter.setViewportTransform([zoom, 0, 0, zoom, xOffset, yOffset])
    this.adapter.requestRenderAll()
  }

  observeZoomAndPan() {
    if (!this.canvas) return

    const canvas = this.canvas
    let isDragging = false
    let lastPosX = 0
    let lastPosY = 0
    let isSpacePressed = false
    window.addEventListener('keydown', (e) => {
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
      )

      const activeObject = this.canvas?.getActiveObject()
      const isEditingText = activeObject && activeObject.type === 'textbox' && activeObject.isEditing

      if (e.code === 'Space' && !isInputFocused && !isEditingText) {
        isSpacePressed = true
        canvas.defaultCursor = 'grab'
        canvas.setCursor('grab')
        canvas.selection = false
      }

      if (!isInputFocused && !isEditingText) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault()
          if (e.shiftKey) {
            this.redo()
          } else {
            this.undo()
          }
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
          e.preventDefault()
          this.redo()
        }
      }
    })

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        isSpacePressed = false
        if (this.activeTool === 'pan') {
          canvas.defaultCursor = 'grab'
          canvas.setCursor('grab')
          canvas.selection = false
        } else if (this.activeTool === 'select') {
          canvas.defaultCursor = 'default'
          canvas.setCursor('default')
          canvas.selection = true
        } else if (['rect', 'circle', 'arrow', 'polyline', 'polygon', 'text', 'pin'].includes(this.activeTool)) {
          canvas.defaultCursor = 'crosshair'
          canvas.setCursor('crosshair')
          canvas.selection = false
        }
      }
    })

    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY
      let zoom = canvas.getZoom()

      zoom *= 0.999 ** delta

      if (zoom > 8) zoom = 8
      if (zoom < 0.5) zoom = 0.5

      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom)

      opt.e.preventDefault()
      opt.e.stopPropagation()
    })

    canvas.on('mouse:down', (opt) => {
      const e = opt.e
      const isRightClick = e.button === 2 || e.which === 3
      const isLeftClick = e.button === 0 || !e.button

      const shouldDrag = isSpacePressed || (this.activeTool === 'pan' && isLeftClick)

      if (shouldDrag) {
        isDragging = true
        canvas.selection = false
        lastPosX = e.clientX
        lastPosY = e.clientY
        canvas.defaultCursor = 'grabbing'
        canvas.setCursor('grabbing')
        return
      }

      if (isRightClick) {
        return
      }

      if (isLeftClick) {
        this.toolService.handleMouseDown(opt)
      }
    })

    canvas.on('mouse:move', (opt) => {
      if (isDragging) {
        const e = opt.e
        const vpt = canvas.viewportTransform

        vpt[4] += e.clientX - lastPosX
        vpt[5] += e.clientY - lastPosY

        canvas.requestRenderAll()

        lastPosX = e.clientX
        lastPosY = e.clientY
        return
      }

      this.toolService.handleMouseMove(opt)
    })

    canvas.on('mouse:up', (opt) => {
      if (isDragging) {
        isDragging = false
        if (isSpacePressed || this.activeTool === 'pan') {
          canvas.defaultCursor = 'grab'
        } else if (['rect', 'circle', 'arrow', 'polyline', 'polygon', 'text', 'pin'].includes(this.activeTool)) {
          canvas.defaultCursor = 'crosshair'
        } else {
          canvas.defaultCursor = 'default'
        }
        canvas.setCursor(canvas.defaultCursor)
        if (!isSpacePressed && this.activeTool === 'select') {
          canvas.selection = true
        }
        return
      }

      this.toolService.handleMouseUp(opt)
    })

    canvas.on('mouse:dblclick', (opt) => {
      const e = opt.e
      if (e.button === 0 || !e.button) {
        this.toolService.handleMouseDblClick(opt)
      }
    })
  }

  // --- HERRAMIENTAS ---

  getViewportCenter() {
    const vpt = this.canvas.viewportTransform
    const zoom = this.canvas.getZoom()
    const left = (this.canvasWidth / 2 - vpt[4]) / zoom
    const top = (this.canvasHeight / 2 - vpt[5]) / zoom
    return { left, top }
  }

  zoomIn(factor = 1.25) {
    if (!this.canvas) return
    let zoom = this.adapter.getZoom() * factor
    if (zoom > 8) zoom = 8
    this.adapter.zoomToPoint({ x: this.canvasWidth / 2, y: this.canvasHeight / 2 }, zoom)
    this.adapter.requestRenderAll()
  }

  zoomOut(factor = 1.25) {
    if (!this.canvas) return
    let zoom = this.adapter.getZoom() / factor
    if (zoom < 0.5) zoom = 0.5
    this.adapter.zoomToPoint({ x: this.canvasWidth / 2, y: this.canvasHeight / 2 }, zoom)
    this.adapter.requestRenderAll()
  }

  zoomHome() {
    if (!this.canvas) return
    if (this.currentMapImage) {
      this.fitMapToCanvas()
    } else {
      this.adapter.setViewportTransform([1, 0, 0, 1, 0, 0])
      this.adapter.requestRenderAll()
    }
  }

  setTool(tool) {
    this.activeTool = tool
    this.updateToolbarAriaPressed(tool)
    this.announceA11y(`Herramienta ${tool} activada`)

    if (typeof this.onToolChange === 'function') {
      this.onToolChange(tool)
    }

    if (!this.canvas) return

    if (this.toolService) {
      this.toolService.setTool(tool)
    }
  }

  announceA11y(msg) {
    const statusEl = document.getElementById('canvas-a11y-status')
    if (statusEl) {
      statusEl.textContent = ''
      setTimeout(() => {
        statusEl.textContent = msg
      }, 50)
    }
  }

  updateToolbarAriaPressed(activeTool) {
    const toolMap = {
      pan: 'tool-pan',
      select: 'tool-select',
      brush: 'tool-brush',
      rect: 'tool-rect',
      circle: 'tool-circle',
      arrow: 'tool-arrow',
      text: 'tool-text',
      pin: 'tool-pin',
    }

    Object.entries(toolMap).forEach(([toolName, btnId]) => {
      const btn = document.getElementById(btnId)
      if (btn) {
        const isSelected = toolName === activeTool
        btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false')
      }
    })
  }

  /**
   * Determina la propiedad de color principal (fill o stroke) para un objeto.
   * @param {Object} obj
   * @returns {string|null}
   */
  getPrimaryColorProperty(obj) {
    if (!obj) return null
    if (obj.type === 'textbox') return 'fill'
    if (obj.type === 'polyline') return 'stroke'
    if (obj.type === 'path') {
      const pathData = obj.path ? obj.path.toString() : ''
      const isPin = pathData.includes('C -12 -13') || pathData.includes('M 0 0 C -12')
      return isPin ? 'fill' : 'stroke'
    }
    return 'fill'
  }

  setActiveColor(color) {
    this.activeColor = color
    this.configureDrawingBrush()

    if (this.canvas) {
      const activeObject = this.adapter.getActiveObject()
      if (activeObject) {
        if (activeObject.type === 'group' || activeObject.getObjects) {
          this.colorSVGGroup(activeObject, color)
        } else {
          const prop = this.getPrimaryColorProperty(activeObject)
          if (prop === 'fill') {
            const hasSameStroke = activeObject.stroke === activeObject.fill
            activeObject.set({ fill: color })
            if (hasSameStroke && ['rect', 'circle', 'polygon'].includes(activeObject.type)) {
              activeObject.set({ stroke: color })
            }
          } else if (prop === 'stroke') {
            activeObject.set({ stroke: color })
          }
        }
        this.adapter.requestRenderAll()
        this.adapter.fire('object:modified')
      }
    }
  }

  setActiveStrokeWidth(width, fireEvent = true) {
    this.activeStrokeWidth = parseInt(width, 10)
    this.configureDrawingBrush()

    if (this.canvas) {
      const activeObject = this.adapter.getActiveObject()
      if (activeObject && activeObject.type !== 'textbox') {
        activeObject.set({ strokeWidth: this.activeStrokeWidth })
        this.adapter.requestRenderAll()
        if (fireEvent) {
          this.adapter.fire('object:modified')
        }
      }
    }
  }

  // --- DIBUJO INTERACTIVO EN TIEMPO REAL (CLICK & DRAG) ---

  createArrowPath(x1, y1, x2, y2) {
    const dx = x2 - x1
    const dy = y2 - y1
    const dist = Math.hypot(dx, dy)

    if (dist < 1e-4) {
      return `M ${x1} ${y1} L ${x1 + 1} ${y1}`
    }

    const angle = Math.atan2(dy, dx)
    const headLen = Math.min(Math.max(15, this.activeStrokeWidth * 2.5), Math.max(15, dist * 0.35))
    const arrowAngle = Math.PI / 6

    const x3 = x2 - headLen * Math.cos(angle - arrowAngle)
    const y3 = y2 - headLen * Math.sin(angle - arrowAngle)
    const x4 = x2 - headLen * Math.cos(angle + arrowAngle)
    const y4 = y2 - headLen * Math.sin(angle + arrowAngle)

    return `M ${x1} ${y1} L ${x2} ${y2} M ${x3} ${y3} L ${x2} ${y2} L ${x4} ${y4}`
  }

  finishCreatedObject(shape, toolWas) {
    shape.set({
      selectable: true,
      evented: true,
    })

    if (typeof shape.setCoords === 'function') {
      shape.setCoords()
    }

    if (toolWas === 'text' && typeof shape.enterEditing === 'function') {
      this.canvas.setActiveObject(shape)
      this.canvas.requestRenderAll()
      this.canvas.fire('object:modified')
      shape.enterEditing()
      if (typeof shape.selectAll === 'function') {
        shape.selectAll()
      }

      const onEditingExited = () => {
        if (typeof shape.off === 'function') {
          shape.off('editing:exited', onEditingExited)
        }
        if (this.activeTool === 'text' && this.adapter) {
          this.adapter.discardActiveObject()
          this.adapter.requestRenderAll()
        }
      }
      if (typeof shape.on === 'function') {
        shape.on('editing:exited', onEditingExited)
      }
    } else {
      this.canvas.requestRenderAll()
      this.canvas.fire('object:modified')
    }
  }

  addRect() {
    if (!this.canvas) return
    const center = this.getViewportCenter()

    const rect = ShapeFactory.createRect({
      left: center.left,
      top: center.top,
      color: this.activeColor,
    })

    this.adapter.addObject(rect)
    this.adapter.setActiveObject(rect)
    this.adapter.requestRenderAll()
    this.adapter.fire('object:modified')
  }

  addCircle() {
    if (!this.canvas) return
    const center = this.getViewportCenter()

    const circle = ShapeFactory.createCircle({
      left: center.left,
      top: center.top,
      color: this.activeColor,
    })

    this.adapter.addObject(circle)
    this.adapter.setActiveObject(circle)
    this.adapter.requestRenderAll()
    this.adapter.fire('object:modified')
  }

  addArrow() {
    if (!this.canvas) return
    const center = this.getViewportCenter()

    const arrow = ShapeFactory.createArrow('M -50 0 L 50 0 M 20 -15 L 50 0 L 20 15', {
      left: center.left,
      top: center.top,
      color: this.activeColor,
      strokeWidth: this.activeStrokeWidth,
    })

    this.adapter.addObject(arrow)
    this.adapter.setActiveObject(arrow)
    this.adapter.requestRenderAll()
    this.adapter.fire('object:modified')
  }

  addText() {
    if (!this.canvas) return
    const center = this.getViewportCenter()

    const text = ShapeFactory.createText('Escribí acá', {
      left: center.left,
      top: center.top,
      color: this.activeColor,
    })

    this.adapter.addObject(text)
    this.adapter.setActiveObject(text)
    this.adapter.requestRenderAll()
    this.adapter.fire('object:modified')
  }

  addPin() {
    if (!this.canvas) return
    const center = this.getViewportCenter()

    const pin = ShapeFactory.createPin({
      left: center.left,
      top: center.top,
      color: this.activeColor,
    })

    this.adapter.addObject(pin)
    this.adapter.setActiveObject(pin)
    this.adapter.requestRenderAll()
    this.adapter.fire('object:modified')
  }

  deleteSelected() {
    if (!this.canvas) return
    const activeObject = this.adapter.getActiveObject()
    if (activeObject && activeObject !== this.currentMapImage) {
      this.adapter.removeObject(activeObject)
      this.adapter.discardActiveObject()
      this.adapter.requestRenderAll()
      this.adapter.fire('object:modified')
    }
  }

  async duplicateSelected() {
    if (!this.canvas) return
    const activeObject = this.adapter.getActiveObject()
    if (!activeObject || activeObject === this.currentMapImage) return

    try {
      const cloned = await activeObject.clone()
      cloned.set({
        left: activeObject.left + 20,
        top: activeObject.top + 20,
        evented: true,
        selectable: true,
      })

      if (cloned.type === 'activeSelection') {
        cloned.canvas = this.canvas
        cloned.forEachObject((obj) => {
          this.adapter.addObject(obj)
        })
        cloned.setCoordinates()
      } else {
        this.adapter.addObject(cloned)
      }

      this.adapter.setActiveObject(cloned)
      this.adapter.requestRenderAll()
      this.adapter.fire('object:modified')
    } catch (err) {
      console.error('CanvasManager: Error clonando objeto:', err)
    }
  }

  bringToFront() {
    if (!this.canvas) return
    const activeObject = this.adapter.getActiveObject()
    if (activeObject && activeObject !== this.currentMapImage) {
      this.adapter.bringObjectToFront(activeObject)
      this.adapter.requestRenderAll()
      this.adapter.fire('object:modified')
    }
  }

  sendToBack() {
    if (!this.canvas) return
    const activeObject = this.adapter.getActiveObject()
    if (activeObject && activeObject !== this.currentMapImage && activeObject.isMapBase !== true) {
      this.adapter.sendObjectToBack(activeObject)
      const mapBaseObj = this.currentMapImage || this.adapter.getObjects().find((obj) => obj.isMapBase === true)
      if (mapBaseObj) {
        this.adapter.sendObjectToBack(mapBaseObj)
      }
      this.adapter.requestRenderAll()
      this.adapter.fire('object:modified')
    }
  }

  clearCanvas() {
    if (!this.canvas) return
    this.clearAllObjects()
    this.adapter.fire('object:modified')
  }

  serialize() {
    if (!this.canvas) return null

    const objects = this.adapter
      .getObjects()
      .filter((obj) => obj !== this.currentMapImage && obj.isMapBase !== true)
    const serializedObjects = objects.map((obj) =>
      typeof obj.toObject === 'function' ? obj.toObject() : { ...obj }
    )
    return JSON.stringify(serializedObjects)
  }

  async deserialize(jsonString) {
    if (!this.canvas) return
    this.clearAllObjects()
    if (!jsonString) return

    try {
      const jsonObjects = JSON.parse(jsonString)
      if (!Array.isArray(jsonObjects) || jsonObjects.length === 0) return

      const objects = await this.adapter.enlivenObjects(jsonObjects)

      this.canvas.renderOnAddRemove = false
      objects.forEach((obj) => {
        obj.set({
          selectable: true,
          evented: true,
        })
        this.adapter.addObject(obj)
      })
      this.canvas.renderOnAddRemove = true
      this.adapter.requestRenderAll()
    } catch (error) {
      console.error('Error deserializando trazos de dibujo:', error)
    }
  }

  exportToPNG(fileName = 'mapa_anotado.png') {
    ExportService.exportToPNG(this, fileName)
  }

  dispose() {
    if (this.resizeManager) {
      this.resizeManager.disconnect()
    }
    this.adapter.dispose()
    this.canvas = null
  }

  async addSticker(url) {
    if (!this.canvas) return
    const center = this.getViewportCenter()

    try {
      const { objects, options } = await this.adapter.loadSVG(url)
      const stickerGroup = this.adapter.groupSVGElements(objects, options)

      // Escalar el sticker para que tenga un tamaño inicial adecuado (250px)
      const targetSize = 100
      const width = stickerGroup.width || targetSize
      const height = stickerGroup.height || targetSize
      const scale = Math.min(targetSize / width, targetSize / height)

      stickerGroup.set({
        left: center.left,
        top: center.top,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
        cornerColor: '#000000',
        transparentCorners: false,
        cornerSize: 10,
        borderColor: '#000000',
        borderScaleFactor: 2,
        hasRotatingPoint: true,
      })

      // Colorear el sticker con el color activo
      this.colorSVGGroup(stickerGroup, this.activeColor)

      this.adapter.addObject(stickerGroup)
      this.adapter.setActiveObject(stickerGroup)
      this.adapter.requestRenderAll()
      this.adapter.fire('object:modified')
      return stickerGroup
    } catch (err) {
      console.error('Error cargando sticker en el canvas:', err)
    }
  }

  colorSVGGroup(group, color) {
    if (!group) return

    const setElementColor = (el) => {
      if (el.getObjects) {
        el.getObjects().forEach((child) => setElementColor(child))
      } else {
        // Colorear rellenos existentes y trazos que no sean transparentes
        if (el.fill && el.fill !== 'none' && el.fill !== 'transparent') {
          el.set({ fill: color })
        }
        if (el.stroke && el.stroke !== 'none' && el.stroke !== 'transparent') {
          el.set({ stroke: color })
        }
      }
    }

    setElementColor(group)
    this.adapter.requestRenderAll()
  }

  async addLocalImage(file) {
    if (!this.canvas || !file) return

    // 1. Validar el tamaño del archivo (Límite: 10 MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('FILE_TOO_LARGE')
    }

    try {
      // 2. Comprimir/Redimensionar la imagen si es rasterizada
      const imageData = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.8 })

      // 3. Insertar la imagen en el lienzo
      const center = this.getViewportCenter()

      const img = await FabricImage.fromURL(
        imageData.dataUrl,
        {
          crossOrigin: 'anonymous',
        },
        {}
      )

      const maxDim = Math.min(this.canvasWidth * 0.5, this.canvasHeight * 0.5, 400)
      let scale = 1
      if (img.width > maxDim || img.height > maxDim) {
        scale = Math.min(maxDim / img.width, maxDim / img.height)
      }

      img.set({
        left: center.left,
        top: center.top,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
        cornerColor: '#000000',
        transparentCorners: false,
        cornerSize: 10,
        borderColor: '#000000',
        borderScaleFactor: 2,
        hasRotatingPoint: true,
      })

      this.adapter.addObject(img)
      this.adapter.setActiveObject(img)
      this.adapter.requestRenderAll()
      this.adapter.fire('object:modified')
      return img
    } catch (err) {
      console.error('Error insertando imagen local:', err)
      throw err
    }
  }

  getExportDataURL(options = {}) {
    if (!this.canvas || !this.currentMapImage) return ''
    const { format = 'png', quality = 1.0, targetWidth } = options

    // Deseleccionar objetos activos para que no salgan controles en la exportación
    this.adapter.discardActiveObject()
    this.adapter.requestRenderAll()

    // Guardar el viewport transform actual
    const vpt = this.adapter.getViewportTransform()

    // Resetear temporalmente el zoom y paneo
    this.adapter.setViewportTransform([1, 0, 0, 1, 0, 0])

    // Límites reales del mapa base
    const left = this.currentMapImage.left
    const top = this.currentMapImage.top
    const width = this.currentMapImage.width * this.currentMapImage.scaleX
    const height = this.currentMapImage.height * this.currentMapImage.scaleY

    // Calcular multiplicador según resolución objetivo
    let multiplier = 1
    if (targetWidth && width > 0) {
      multiplier = targetWidth / width
    } else if (options.multiplier) {
      multiplier = options.multiplier
    }

    const dataUrl = this.adapter.toDataURL({
      format: format === 'jpg' ? 'jpeg' : format,
      quality: Math.min(Math.max(quality, 0.1), 1.0),
      multiplier: multiplier,
      left,
      top,
      width,
      height,
    })

    // Restaurar zoom y paneo del usuario
    this.adapter.setViewportTransform(vpt)
    this.adapter.requestRenderAll()

    return dataUrl
  }

  hasFilter(obj, filterType) {
    return this.adapter.hasFilter(obj, filterType)
  }

  applyFilter(obj, filterType, enabledOrVal) {
    this.adapter.applyFilter(obj, filterType, enabledOrVal)
  }

  undo() {
    return this.historyManager.undo()
  }

  redo() {
    return this.historyManager.redo()
  }

  createMemento() {
    const stateStr = this.serialize()
    return new Memento(stateStr)
  }

  async restoreMemento(memento) {
    if (!memento) return
    this.isRestoringHistory = true
    try {
      await this.deserialize(memento.getState())
      this.adapter.discardActiveObject()
      this.adapter.requestRenderAll()
      this.announceA11y('Estado restaurado')
      this.adapter.fire('history:restored')
    } catch (error) {
      console.error('Error restaurando el memento:', error)
    } finally {
      this.isRestoringHistory = false
    }
  }

  clearAllObjects() {
    if (!this.canvas) return
    const objects = [...this.adapter.getObjects()]
    objects.forEach((obj) => {
      if (obj !== this.currentMapImage && obj.isMapBase !== true) {
        this.adapter.removeObject(obj)
      }
    })
    this.adapter.discardActiveObject()
    this.adapter.requestRenderAll()
  }
}
