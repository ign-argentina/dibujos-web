import { Canvas, FabricImage, Rect, Circle, Textbox, Path, PencilBrush, util, loadSVGFromURL } from 'fabric'

export class CanvasManager {
  constructor(container, options = {}) {
    if (!(container instanceof HTMLElement)) {
      throw new TypeError('CanvasManager espera un contenedor HTML válido')
    }

    this.container = container
    this.options = options
    this.canvas = null
    this.canvasEl = null
    this.resizeObserver = null

    // Dimensiones en caché para evitar bucles de redimensionamiento
    this.canvasWidth = 0
    this.canvasHeight = 0

    // Almacenamiento para el mapa base y la imagen
    this.currentMapImage = null
    this.currentMapUrl = null

    // Propiedades de herramientas NBI
    this.activeColor = '#FFF4B0'
    this.activeStrokeWidth = 8
    this.activeTool = 'select'
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

    this.canvas = new Canvas(this.canvasEl, {
      selection: true,
      preserveObjectStacking: true,
      ...this.options,
    })

    this.configureDrawingBrush()
    this.observeZoomAndPan()
    this.observeResize()
    this.resizeCanvas()
  }

  createCanvasElement() {
    this.canvasEl = document.createElement('canvas')
    this.canvasEl.className = 'fabric-canvas'
    this.container.appendChild(this.canvasEl)
  }

  configureDrawingBrush() {
    if (!this.canvas) return

    // Instancia el pincel de dibujo
    if (!this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush = new PencilBrush(this.canvas)
    }
    this.canvas.freeDrawingBrush.color = this.activeColor
    this.canvas.freeDrawingBrush.width = this.activeStrokeWidth
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

      this.canvas.setDimensions({ width, height })
      this.canvas.calcOffset()
      this.canvas.requestRenderAll()

      if (this.currentMapImage) {
        this.fitMapToCanvas()
      }
    }
  }

  observeResize() {
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas())
      this.resizeObserver.observe(this.container)
    } else {
      window.addEventListener('resize', () => this.resizeCanvas())
    }
  }

  async loadMap(url) {
    if (!this.canvas) return

    if (this.currentMapImage) {
      this.canvas.remove(this.currentMapImage)
      this.currentMapImage = null
    }

    try {
      this.currentMapUrl = url

      // FabricImage.fromURL en v7: (url, loadOptions, imageOptions)
      const img = await FabricImage.fromURL(url, {
        crossOrigin: 'anonymous',
      }, {})

      img.set({
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
        hoverCursor: 'default',
        originX: 'left',
        originY: 'top',
      })

      this.currentMapImage = img

      this.canvas.insertAt(0, img)
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

    this.canvas.setViewportTransform([zoom, 0, 0, zoom, xOffset, yOffset])
    this.canvas.requestRenderAll()
  }

  observeZoomAndPan() {
    if (!this.canvas) return

    const canvas = this.canvas
    let isDragging = false
    let lastPosX = 0
    let lastPosY = 0
    let isSpacePressed = false

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        isSpacePressed = true
        canvas.defaultCursor = 'grab'
        canvas.setCursor('grab')
        canvas.selection = false
      }
    })

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        isSpacePressed = false
        if (this.activeTool === 'select') {
          canvas.defaultCursor = 'default'
          canvas.setCursor('default')
          canvas.selection = true
        } else if (['rect', 'circle', 'arrow', 'text', 'pin'].includes(this.activeTool)) {
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

      if (isSpacePressed || isRightClick) {
        isDragging = true
        canvas.selection = false
        lastPosX = e.clientX
        lastPosY = e.clientY
        canvas.defaultCursor = 'grabbing'
        canvas.setCursor('grabbing')
        return
      }

      if (['rect', 'circle', 'arrow', 'text', 'pin'].includes(this.activeTool) && (e.button === 0 || !e.button)) {
        this.startShapeDrawing(opt)
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

      if (this.isDrawingShape) {
        this.updateShapeDrawing(opt)
      }
    })

    canvas.on('mouse:up', (opt) => {
      if (isDragging) {
        isDragging = false
        if (isSpacePressed) {
          canvas.defaultCursor = 'grab'
        } else if (['rect', 'circle', 'arrow', 'text', 'pin'].includes(this.activeTool)) {
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

      if (this.isDrawingShape) {
        this.finishShapeDrawing(opt)
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
    let zoom = this.canvas.getZoom() * factor
    if (zoom > 8) zoom = 8
    this.canvas.zoomToPoint(
      { x: this.canvasWidth / 2, y: this.canvasHeight / 2 },
      zoom
    )
    this.canvas.requestRenderAll()
  }

  zoomOut(factor = 1.25) {
    if (!this.canvas) return
    let zoom = this.canvas.getZoom() / factor
    if (zoom < 0.5) zoom = 0.5
    this.canvas.zoomToPoint(
      { x: this.canvasWidth / 2, y: this.canvasHeight / 2 },
      zoom
    )
    this.canvas.requestRenderAll()
  }

  zoomHome() {
    if (!this.canvas) return
    if (this.currentMapImage) {
      this.fitMapToCanvas()
    } else {
      this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
      this.canvas.requestRenderAll()
    }
  }

  setTool(tool) {
    this.activeTool = tool
    if (!this.canvas) return

    if (tool === 'brush') {
      this.canvas.isDrawingMode = true
      this.configureDrawingBrush()
      this.canvas.defaultCursor = 'default'
      this.canvas.setCursor('default')
      this.canvas.selection = false
    } else if (['rect', 'circle', 'arrow', 'text', 'pin'].includes(tool)) {
      this.canvas.isDrawingMode = false
      this.canvas.selection = false
      this.canvas.defaultCursor = 'crosshair'
      this.canvas.setCursor('crosshair')
    } else {
      this.activeTool = 'select'
      this.canvas.isDrawingMode = false
      this.canvas.selection = true
      this.canvas.defaultCursor = 'default'
      this.canvas.setCursor('default')
    }
  }

  setActiveColor(color) {
    this.activeColor = color
    this.configureDrawingBrush()

    if (this.canvas) {
      const activeObject = this.canvas.getActiveObject()
      if (activeObject) {
        if (activeObject instanceof Textbox) {
          activeObject.set({ fill: color })
        } else if (activeObject instanceof Path && activeObject.fill === 'transparent') {
          activeObject.set({ stroke: color })
        } else if (activeObject.type === 'group' || activeObject.getObjects) {
          this.colorSVGGroup(activeObject, color)
        } else {
          activeObject.set({ fill: color, stroke: color })
        }
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      }
    }
  }

  setActiveStrokeWidth(width) {
    this.activeStrokeWidth = parseInt(width, 10)
    this.configureDrawingBrush()

    if (this.canvas) {
      const activeObject = this.canvas.getActiveObject()
      if (activeObject && !(activeObject instanceof Textbox)) {
        activeObject.set({ strokeWidth: this.activeStrokeWidth })
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
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

  startShapeDrawing(opt) {
    if (!this.canvas) return
    const pointer = this.canvas.getScenePoint(opt.e)
    this.isDrawingShape = true
    this.drawStartPoint = pointer

    const x = pointer.x
    const y = pointer.y

    switch (this.activeTool) {
      case 'rect':
        this.previewShape = new Rect({
          left: x,
          top: y,
          width: 1,
          height: 1,
          fill: this.activeColor,
          stroke: this.activeColor,
          strokeWidth: 2,
          rx: 4,
          ry: 4,
          originX: 'left',
          originY: 'top',
          opacity: 0.7,
          selectable: false,
          evented: false,
        })
        break
      case 'circle':
        this.previewShape = new Circle({
          left: x,
          top: y,
          radius: 1,
          fill: this.activeColor,
          stroke: this.activeColor,
          strokeWidth: 2,
          originX: 'left',
          originY: 'top',
          opacity: 0.7,
          selectable: false,
          evented: false,
        })
        break
      case 'arrow':
        this.previewShape = new Path(this.createArrowPath(x, y, x + 1, y + 1), {
          stroke: this.activeColor,
          strokeWidth: this.activeStrokeWidth,
          fill: 'transparent',
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
          selectable: false,
          evented: false,
        })
        break
      case 'text':
        this.previewShape = new Textbox('Escribí acá', {
          left: x,
          top: y,
          fontFamily: 'Fredoka',
          fontSize: 24,
          fontWeight: '500',
          fill: this.activeColor,
          stroke: 'transparent',
          originX: 'left',
          originY: 'top',
          textAlign: 'left',
          width: 1,
          selectable: false,
          evented: false,
        })
        break
      case 'pin':
        this.previewShape = new Path('M 0 0 C -12 -13 -18 -24 -18 -34 A 18 18 0 1 1 18 -34 C 18 -24 12 -13 0 0 Z M 0 -40 A 6 6 0 1 0 0 -28 A 6 6 0 1 0 0 -40 Z', {
          left: x,
          top: y,
          fill: this.activeColor,
          stroke: '#000000',
          strokeWidth: 3,
          originX: 'center',
          originY: 'bottom',
          opacity: 0.9,
          scaleX: 0.1,
          scaleY: 0.1,
          selectable: false,
          evented: false,
        })
        break
    }

    if (this.previewShape) {
      this.canvas.add(this.previewShape)
      this.canvas.requestRenderAll()
    }
  }

  updateShapeDrawing(opt) {
    if (!this.isDrawingShape || !this.drawStartPoint || !this.previewShape) return

    const pointer = this.canvas.getScenePoint(opt.e)
    const startX = this.drawStartPoint.x
    const startY = this.drawStartPoint.y
    const currentX = pointer.x
    const currentY = pointer.y

    const deltaX = currentX - startX
    const deltaY = currentY - startY

    switch (this.activeTool) {
      case 'rect': {
        const left = Math.min(startX, currentX)
        const top = Math.min(startY, currentY)
        const width = Math.max(Math.abs(deltaX), 1)
        const height = Math.max(Math.abs(deltaY), 1)
        this.previewShape.set({ left, top, width, height })
        break
      }
      case 'circle': {
        const diameter = Math.max(Math.abs(deltaX), Math.abs(deltaY))
        const radius = Math.max(diameter / 2, 1)
        const left = Math.min(startX, currentX)
        const top = Math.min(startY, currentY)
        this.previewShape.set({ left, top, radius })
        break
      }
      case 'arrow': {
        this.canvas.remove(this.previewShape)
        this.previewShape = new Path(this.createArrowPath(startX, startY, currentX, currentY), {
          stroke: this.activeColor,
          strokeWidth: this.activeStrokeWidth,
          fill: 'transparent',
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
          selectable: false,
          evented: false,
        })
        this.canvas.add(this.previewShape)
        break
      }
      case 'text': {
        const left = Math.min(startX, currentX)
        const top = Math.min(startY, currentY)
        const width = Math.max(Math.abs(deltaX), 120)
        this.previewShape.set({ left, top, width })
        break
      }
      case 'pin': {
        const dist = Math.hypot(deltaX, deltaY)
        const scale = Math.max(0.2, Math.min(3, dist / 50))
        this.previewShape.set({ left: startX, top: startY, scaleX: scale, scaleY: scale })
        break
      }
    }

    this.canvas.requestRenderAll()
  }

  finishShapeDrawing(opt) {
    if (!this.isDrawingShape || !this.drawStartPoint || !this.previewShape) return

    const pointer = this.canvas.getScenePoint(opt.e)
    const startX = this.drawStartPoint.x
    const startY = this.drawStartPoint.y
    const currentX = pointer.x
    const currentY = pointer.y

    const dist = Math.hypot(currentX - startX, currentY - startY)
    const isClick = dist < 5

    const toolWas = this.activeTool
    const finalShape = this.previewShape

    this.isDrawingShape = false
    this.drawStartPoint = null
    this.previewShape = null

    if (isClick) {
      switch (toolWas) {
        case 'rect':
          finalShape.set({
            left: startX,
            top: startY,
            width: 140,
            height: 100,
            originX: 'center',
            originY: 'center',
          })
          break
        case 'circle':
          finalShape.set({
            left: startX,
            top: startY,
            radius: 60,
            originX: 'center',
            originY: 'center',
          })
          break
        case 'arrow':
          this.canvas.remove(finalShape)
          const defaultArrow = new Path(this.createArrowPath(startX - 50, startY, startX + 50, startY), {
            stroke: this.activeColor,
            strokeWidth: this.activeStrokeWidth,
            fill: 'transparent',
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
          })
          this.canvas.add(defaultArrow)
          this.finishCreatedObject(defaultArrow, toolWas)
          return
        case 'text':
          finalShape.set({
            left: startX,
            top: startY,
            width: 180,
            originX: 'center',
            originY: 'center',
            textAlign: 'center',
          })
          break
        case 'pin':
          finalShape.set({
            left: startX,
            top: startY,
            scaleX: 1,
            scaleY: 1,
            originX: 'center',
            originY: 'bottom',
          })
          break
      }
    } else {
      if (toolWas === 'rect' || toolWas === 'circle' || toolWas === 'text') {
        finalShape.set({
          originX: 'left',
          originY: 'top',
        })
      } else if (toolWas === 'pin') {
        finalShape.set({
          left: startX,
          top: startY,
          originX: 'center',
          originY: 'bottom',
        })
      }
    }

    this.finishCreatedObject(finalShape, toolWas)
  }

  finishCreatedObject(shape, toolWas) {
    shape.set({
      selectable: true,
      evented: true,
    })

    this.canvas.setActiveObject(shape)
    this.canvas.requestRenderAll()
    this.canvas.fire('object:modified')

    if (toolWas === 'text' && typeof shape.enterEditing === 'function') {
      shape.enterEditing()
      shape.selectAll()
    }

    this.setTool('select')
    if (typeof this.onToolChange === 'function') {
      this.onToolChange('select')
    }
  }

  addRect() {
    if (!this.canvas) return
    const center = this.getViewportCenter()

    const rect = new Rect({
      left: center.left,
      top: center.top,
      width: 140,
      height: 100,
      fill: this.activeColor,
      stroke: this.activeColor,
      strokeWidth: 2,
      rx: 4,
      ry: 4,
      originX: 'center',
      originY: 'center',
      opacity: 0.7,
    })

    this.canvas.add(rect)
    this.canvas.setActiveObject(rect)
    this.canvas.requestRenderAll()
    this.canvas.fire('object:modified')
  }

  addCircle() {
    if (!this.canvas) return
    const center = this.getViewportCenter()

    const circle = new Circle({
      left: center.left,
      top: center.top,
      radius: 60,
      fill: this.activeColor,
      stroke: this.activeColor,
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
      opacity: 0.7,
    })

    this.canvas.add(circle)
    this.canvas.setActiveObject(circle)
    this.canvas.requestRenderAll()
    this.canvas.fire('object:modified')
  }

  addArrow() {
    if (!this.canvas) return
    const center = this.getViewportCenter()

    const arrow = new Path('M -50 0 L 50 0 M 20 -15 L 50 0 L 20 15', {
      left: center.left,
      top: center.top,
      stroke: this.activeColor,
      strokeWidth: this.activeStrokeWidth,
      fill: 'transparent',
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      originX: 'center',
      originY: 'center',
    })

    this.canvas.add(arrow)
    this.canvas.setActiveObject(arrow)
    this.canvas.requestRenderAll()
    this.canvas.fire('object:modified')
  }

  addText() {
    if (!this.canvas) return
    const center = this.getViewportCenter()

    const text = new Textbox('Escribí acá', {
      left: center.left,
      top: center.top,
      fontFamily: 'Fredoka',
      fontSize: 24,
      fontWeight: '500',
      fill: this.activeColor,
      stroke: 'transparent',
      originX: 'center',
      originY: 'center',
      textAlign: 'center',
      width: 180,
    })

    this.canvas.add(text)
    this.canvas.setActiveObject(text)
    this.canvas.requestRenderAll()
    this.canvas.fire('object:modified')
  }

  addPin() {
    if (!this.canvas) return
    const center = this.getViewportCenter()

    // Crear un pin/marcador neo-brutalista (gota invertida con un círculo central calado)
    const pin = new Path('M 0 0 C -12 -13 -18 -24 -18 -34 A 18 18 0 1 1 18 -34 C 18 -24 12 -13 0 0 Z M 0 -40 A 6 6 0 1 0 0 -28 A 6 6 0 1 0 0 -40 Z', {
      left: center.left,
      top: center.top,
      fill: this.activeColor,
      stroke: '#000000',
      strokeWidth: 3,
      originX: 'center',
      originY: 'bottom', // El extremo inferior del marcador coincide con el punto del mapa
      opacity: 0.9,
    })

    this.canvas.add(pin)
    this.canvas.setActiveObject(pin)
    this.canvas.requestRenderAll()
    this.canvas.fire('object:modified')
  }

  deleteSelected() {
    if (!this.canvas) return
    const activeObject = this.canvas.getActiveObject()
    if (activeObject) {
      this.canvas.remove(activeObject)
      this.canvas.discardActiveObject()
      this.canvas.requestRenderAll()
      this.canvas.fire('object:modified')
    }
  }

  clearCanvas() {
    if (!this.canvas) return

    const objects = this.canvas.getObjects()
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i]
      if (obj !== this.currentMapImage) {
        this.canvas.remove(obj)
      }
    }
    this.canvas.discardActiveObject()
    this.canvas.requestRenderAll()
    this.canvas.fire('object:modified')
  }

  serialize() {
    if (!this.canvas) return null

    const objects = this.canvas.getObjects().filter(obj => obj !== this.currentMapImage)
    const serializedObjects = objects.map(obj => obj.toObject())
    return JSON.stringify(serializedObjects)
  }

  async deserialize(jsonString) {
    if (!this.canvas || !jsonString) return

    try {
      const jsonObjects = JSON.parse(jsonString)
      if (!Array.isArray(jsonObjects) || jsonObjects.length === 0) return

      const objects = await util.enlivenObjects(jsonObjects)

      this.canvas.renderOnAddRemove = false
      objects.forEach((obj) => {
        this.canvas.add(obj)
      })
      this.canvas.renderOnAddRemove = true
      this.canvas.requestRenderAll()
    } catch (error) {
      console.error('Error deserializando trazos de dibujo:', error)
    }
  }

  exportToPNG(fileName = 'mapa_anotado.png') {
    if (!this.canvas) return

    this.canvas.discardActiveObject()
    this.canvas.requestRenderAll()

    setTimeout(() => {
      try {
        const dataUrl = this.canvas.toDataURL({
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
        console.error('Error exportando lienzo a PNG:', error)
      }
    }, 50)
  }

  dispose() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }

    if (this.canvas) {
      this.canvas.dispose()
      this.canvas = null
    }
  }

  async addSticker(url) {
    if (!this.canvas) return
    const center = this.getViewportCenter()

    try {
      const { objects, options } = await loadSVGFromURL(url)
      const stickerGroup = util.groupSVGElements(objects, options)

      stickerGroup.set({
        left: center.left,
        top: center.top,
        originX: 'center',
        originY: 'center',
        cornerColor: '#000000',
        transparentCorners: false,
        cornerSize: 10,
        borderColor: '#000000',
        borderScaleFactor: 2,
        hasRotatingPoint: true,
      })

      // Escalar el sticker para que tenga un tamaño inicial óptimo de 100px max
      const scale = Math.min(100 / stickerGroup.width, 100 / stickerGroup.height, 1)
      stickerGroup.scale(scale)

      // Colorear el sticker con el color activo
      this.colorSVGGroup(stickerGroup, this.activeColor)

      this.canvas.add(stickerGroup)
      this.canvas.setActiveObject(stickerGroup)
      this.canvas.requestRenderAll()
      this.canvas.fire('object:modified')
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
    this.canvas.requestRenderAll()
  }
}
