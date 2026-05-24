import { Canvas, FabricImage } from 'fabric'

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
    
    this.observeResize()
    this.observeZoomAndPan()
    this.resizeCanvas()
  }

  createCanvasElement() {
    this.canvasEl = document.createElement('canvas')
    this.canvasEl.className = 'fabric-canvas'
    this.container.appendChild(this.canvasEl)
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
        canvas.setCursor('default')
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


