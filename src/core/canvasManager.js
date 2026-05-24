import { Canvas, FabricImage, Rect, Circle, Textbox, Path, util } from 'fabric'

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
    
    // Propiedades de herramientas NBI-DS
    this.activeColor = '#FFF4B0' // Color pastel inicial (Amarillo)
    this.activeStrokeWidth = 8   // Grosor inicial del lápiz
    this.activeTool = 'select'   // Herramienta inicial (Puntero)
    
    // Prevenir el menú contextual para permitir arrastrar con botón derecho
    this.container.addEventListener('contextmenu', (e) => {
      e.preventDefault()
    })
  }

  init() {
    this.createCanvasElement()
    
    // Crear el canvas de Fabric.js v7
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
    
    // Configurar pincel libre de Fabric v7
    if (this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.color = this.activeColor
      this.canvas.freeDrawingBrush.width = this.activeStrokeWidth
    }
  }

  resizeCanvas() {
    if (!this.canvas) return

    const rect = this.container.getBoundingClientRect()
    const width = Math.max(Math.round(rect.width), 0)
    const height = Math.max(Math.round(rect.height), 0)

    if (!width || !height) return

    // Evitar bucles: solo redimensionar si las dimensiones cambiaron
    if (this.canvasWidth !== width || this.canvasHeight !== height) {
      this.canvasWidth = width
      this.canvasHeight = height
      
      // Fabric.js v7 usa setDimensions({ width, height })
      this.canvas.setDimensions({ width, height })
      
      // Recalcular offsets para mantener correcta la interacción táctil/puntero
      this.canvas.calcOffset()
      this.canvas.requestRenderAll()
      
      // Reajustar la escala del mapa si está cargado
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

    // Si ya hay un mapa cargado, removerlo primero
    if (this.currentMapImage) {
      this.canvas.remove(this.currentMapImage)
      this.currentMapImage = null
    }

    try {
      this.currentMapUrl = url
      
      // FabricImage.fromURL es asincrónico y retorna una Promesa en v7
      const img = await FabricImage.fromURL(url, {
        crossOrigin: 'anonymous'
      })

      // Bloquear la imagen del mapa (NBI-DS base locked layer)
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
      
      // Añadir la imagen en el fondo
      this.canvas.insertAt(0, img)
      
      // Centrar y escalar (Contain)
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

    // Determinar factor de escala (Contain)
    const canvasRatio = canvasWidth / canvasHeight
    const imgRatio = imgWidth / imgHeight

    let scale = 1
    if (imgRatio > canvasRatio) {
      scale = canvasWidth / imgWidth
    } else {
      scale = canvasHeight / imgHeight
    }

    // Calcular posiciones de centrado
    const left = (canvasWidth - imgWidth * scale) / 2
    const top = (canvasHeight - imgHeight * scale) / 2

    this.currentMapImage.set({
      scaleX: scale,
      scaleY: scale,
      left: left,
      top: top,
    })

    // Resetear el viewport transform al cargar un mapa
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    this.canvas.requestRenderAll()
  }

  observeZoomAndPan() {
    if (!this.canvas) return

    const canvas = this.canvas
    let isDragging = false
    let lastPosX = 0
    let lastPosY = 0
    let isSpacePressed = false

    // Escuchar la barra espaciadora
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        isSpacePressed = true
        if (canvas.defaultCursor === 'default') {
          canvas.defaultCursor = 'grab'
          canvas.setCursor('grab')
        }
        canvas.selection = false
      }
    })

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        isSpacePressed = false
        canvas.defaultCursor = 'default'
        canvas.setCursor('default' || 'default')
        canvas.selection = true
      }
    })

    // Zoom con la rueda del ratón
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY
      let zoom = canvas.getZoom()
      
      zoom *= 0.999 ** delta

      // Limitar zoom entre 0.5x y 8x para no perderse
      if (zoom > 8) zoom = 8
      if (zoom < 0.5) zoom = 0.5

      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom)
      
      opt.e.preventDefault()
      opt.e.stopPropagation()
    })

    // Arrastre con barra espaciadora o botón secundario del ratón
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
      }
    })

    canvas.on('mouse:up', () => {
      isDragging = false
      canvas.defaultCursor = isSpacePressed ? 'grab' : 'default'
      canvas.setCursor(canvas.defaultCursor)
      if (!isSpacePressed) {
        canvas.selection = true
      }
    })
  }

  // --- MÉTODOS DE HERRAMIENTAS Y ANOTACIONES NBI-DS ---

  // Obtener el centro visual del canvas teniendo en cuenta el zoom y paneo
  getViewportCenter() {
    const vpt = this.canvas.viewportTransform
    const zoom = this.canvas.getZoom()
    const left = (this.canvasWidth / 2 - vpt[4]) / zoom
    const top = (this.canvasHeight / 2 - vpt[5]) / zoom
    return { left, top }
  }

  setTool(tool) {
    this.activeTool = tool
    if (!this.canvas) return

    if (tool === 'brush') {
      this.canvas.isDrawingMode = true
      this.configureDrawingBrush()
    } else {
      this.canvas.isDrawingMode = false
    }
  }

  setActiveColor(color) {
    this.activeColor = color
    this.configureDrawingBrush()
    
    // Si hay un elemento seleccionado, actualizar su color en tiempo real (premium style)
    if (this.canvas) {
      const activeObject = this.canvas.getActiveObject()
      if (activeObject) {
        if (activeObject instanceof Textbox) {
          activeObject.set({ backgroundColor: color })
        } else if (activeObject instanceof Path && activeObject.fill === 'transparent') {
          // Para líneas/flechas vacías, actualizar el stroke
          activeObject.set({ stroke: color })
        } else {
          // Para formas sólidas, actualizar el relleno
          activeObject.set({ fill: color })
        }
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      }
    }
  }

  setActiveStrokeWidth(width) {
    this.activeStrokeWidth = parseInt(width, 10)
    this.configureDrawingBrush()
    
    // Si hay un elemento seleccionado que usa bordes, actualizarlo
    if (this.canvas) {
      const activeObject = this.canvas.getActiveObject()
      if (activeObject && !(activeObject instanceof Textbox)) {
        activeObject.set({ strokeWidth: this.activeStrokeWidth })
        this.canvas.requestRenderAll()
        this.canvas.fire('object:modified')
      }
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
      stroke: '#000000',
      strokeWidth: 4,
      rx: 12, // Esquinas perfectamente redondeadas
      ry: 12,
      originX: 'center',
      originY: 'center',
      shadow: {
        color: '#000000',
        blur: 0,
        offsetX: 5,
        offsetY: 5
      }
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
      stroke: '#000000',
      strokeWidth: 4,
      originX: 'center',
      originY: 'center',
      shadow: {
        color: '#000000',
        blur: 0,
        offsetX: 5,
        offsetY: 5
      }
    })
    
    this.canvas.add(circle)
    this.canvas.setActiveObject(circle)
    this.canvas.requestRenderAll()
    this.canvas.fire('object:modified')
  }

  addArrow() {
    if (!this.canvas) return
    const center = this.getViewportCenter()
    
    // Una flecha brutalista con trazo grueso negro de tipo Path
    const arrow = new Path('M -50 0 L 50 0 M 20 -15 L 50 0 L 20 15', {
      left: center.left,
      top: center.top,
      stroke: '#000000',
      strokeWidth: 6,
      fill: 'transparent',
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      originX: 'center',
      originY: 'center',
      shadow: {
        color: '#000000',
        blur: 0,
        offsetX: 4,
        offsetY: 4
      }
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
      fontSize: 26,
      fontWeight: 'bold',
      fill: '#000000',
      stroke: 'transparent',
      backgroundColor: this.activeColor,
      padding: 10,
      originX: 'center',
      originY: 'center',
      textAlign: 'center',
      width: 180,
      borderColor: '#000000',
      cornerColor: '#000000',
      cornerStyle: 'circle',
      borderScaleFactor: 2,
      shadow: {
        color: '#000000',
        blur: 0,
        offsetX: 4,
        offsetY: 4
      }
    })
    
    // Ocultar controles superior/inferior centrales para mantener la caja limpia
    text.setControlsVisibility({
      mb: false,
      mt: false
    })
    
    this.canvas.add(text)
    this.canvas.setActiveObject(text)
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
    // Remover todos los objetos excepto el mapa de fondo
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
    
    // Excluir la imagen del mapa base para ahorrar espacio y evitar exceder la cuota
    const objects = this.canvas.getObjects().filter(obj => obj !== this.currentMapImage)
    
    // Serializar los trazos y formas a un formato JSON compatible
    const serializedObjects = objects.map(obj => obj.toObject())
    return JSON.stringify(serializedObjects)
  }

  async deserialize(jsonString) {
    if (!this.canvas || !jsonString) return
    
    try {
      const jsonObjects = JSON.parse(jsonString)
      if (!Array.isArray(jsonObjects) || jsonObjects.length === 0) return
      
      // Recrear objetos usando la utilidad asincrónica de Fabric v7 (retorna Promesa)
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

    // Deseleccionar el objeto activo antes de tomar la captura para que no salgan los controles del recuadro
    this.canvas.discardActiveObject()
    this.canvas.requestRenderAll()

    // Un retraso minúsculo para asegurar que se limpie el recuadro de controles en pantalla
    setTimeout(() => {
      try {
        const dataUrl = this.canvas.toDataURL({
          format: 'png',
          quality: 1.0,
          multiplier: 2 // Duplicar el tamaño para una descarga ultra-nítida
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
}
