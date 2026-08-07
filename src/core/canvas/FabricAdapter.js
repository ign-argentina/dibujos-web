import { Canvas, FabricImage, PencilBrush, util, loadSVGFromURL, filters, FabricObject } from 'fabric'

// Configuración de bordes y manejadores de control (handles) oscuros para todos los objetos
if (FabricObject) {
  if (!FabricObject.ownDefaults) {
    FabricObject.ownDefaults = {}
  }
  FabricObject.ownDefaults.borderColor = '#000000'
  FabricObject.ownDefaults.cornerColor = '#000000'
  FabricObject.ownDefaults.cornerStrokeColor = '#000000'
  FabricObject.ownDefaults.transparentCorners = false
  FabricObject.ownDefaults.cornerSize = 10
  FabricObject.ownDefaults.borderScaleFactor = 2

  if (FabricObject.prototype) {
    FabricObject.prototype.borderColor = '#000000'
    FabricObject.prototype.cornerColor = '#000000'
    FabricObject.prototype.cornerStrokeColor = '#000000'
    FabricObject.prototype.transparentCorners = false
    FabricObject.prototype.cornerSize = 10
    FabricObject.prototype.borderScaleFactor = 2
  }
}

/**
 * Adaptador de Fabric.js para encapsular su API de bajo nivel.
 * Sigue el principio de Inversión de Dependencias (DIP) y desacopla el core de Fabric.js.
 */
export class FabricAdapter {
  constructor() {
    this.canvas = null
  }

  /**
   * Inicializa el lienzo físico de Fabric.js
   * @param {HTMLCanvasElement} canvasEl - Elemento canvas del DOM.
   * @param {Object} options - Opciones de inicialización.
   */
  init(canvasEl, options = {}) {
    this.canvas = new Canvas(canvasEl, {
      selection: true,
      preserveObjectStacking: true,
      ...options,
    })
  }

  /**
   * Agrega un objeto al lienzo
   * @param {Object} obj
   */
  addObject(obj) {
    if (!this.canvas) return
    this.canvas.add(obj)
  }

  /**
   * Inserta un objeto en una posición específica (z-index)
   * @param {number} index
   * @param {Object} obj
   */
  insertAt(index, obj) {
    if (!this.canvas) return
    this.canvas.insertAt(index, obj)
  }

  /**
   * Remueve un objeto del lienzo
   * @param {Object} obj
   */
  removeObject(obj) {
    if (!this.canvas) return
    this.canvas.remove(obj)
  }

  /**
   * Obtiene el objeto actualmente seleccionado
   * @returns {Object|null}
   */
  getActiveObject() {
    if (!this.canvas) return null
    return this.canvas.getActiveObject()
  }

  /**
   * Selecciona un objeto específico en el lienzo
   * @param {Object} obj
   */
  setActiveObject(obj) {
    if (!this.canvas) return
    this.canvas.setActiveObject(obj)
  }

  /**
   * Cancela la selección actual
   */
  discardActiveObject() {
    if (!this.canvas) return
    this.canvas.discardActiveObject()
  }

  /**
   * Obtiene todos los objetos del lienzo
   * @returns {Array}
   */
  getObjects() {
    if (!this.canvas) return []
    return this.canvas.getObjects()
  }

  /**
   * Trae un objeto al frente (z-index máximo)
   * @param {Object} obj
   */
  bringObjectToFront(obj) {
    if (!this.canvas) return
    this.canvas.bringObjectToFront(obj)
  }

  /**
   * Envía un objeto al fondo (z-index mínimo)
   * @param {Object} obj
   */
  sendObjectToBack(obj) {
    if (!this.canvas) return
    this.canvas.sendObjectToBack(obj)
  }

  /**
   * Mueve un objeto a una posición específica de z-index
   * @param {Object} obj
   * @param {number} index
   */
  moveObjectTo(obj, index) {
    if (!this.canvas) return
    this.canvas.moveTo(obj, index)
  }

  /**
   * Obtiene el nivel de zoom actual
   * @returns {number}
   */
  getZoom() {
    if (!this.canvas) return 1
    return this.canvas.getZoom()
  }

  /**
   * Configura el zoom a un punto específico
   * @param {Object} point - Coordenadas { x, y }
   * @param {number} value - Escala de zoom
   */
  zoomToPoint(point, value) {
    if (!this.canvas) return
    this.canvas.zoomToPoint(point, value)
  }

  /**
   * Obtiene la matriz de transformación del viewport
   * @returns {Array}
   */
  getViewportTransform() {
    if (!this.canvas) return [1, 0, 0, 1, 0, 0]
    return [...this.canvas.viewportTransform]
  }

  /**
   * Configura la matriz de transformación del viewport
   * @param {Array} vpt
   */
  setViewportTransform(vpt) {
    if (!this.canvas) return
    this.canvas.setViewportTransform(vpt)
  }

  /**
   * Fuerza el redibujado de todos los elementos del lienzo
   */
  requestRenderAll() {
    if (!this.canvas) return
    this.canvas.requestRenderAll()
  }

  /**
   * Configura las dimensiones lógicas y físicas del lienzo
   * @param {Object} dim - { width, height }
   */
  setDimensions(dim) {
    if (!this.canvas) return
    this.canvas.setDimensions(dim)
  }

  /**
   * Recalcula la posición física del canvas en la ventana
   */
  calcOffset() {
    if (!this.canvas) return
    this.canvas.calcOffset()
  }

  /**
   * Obtiene el punto en escena respecto a la ventana del navegador
   * @param {Event} e
   * @returns {Object} Coordenadas { x, y }
   */
  getScenePoint(e) {
    if (!this.canvas) return { x: 0, y: 0 }
    return this.canvas.getScenePoint(e)
  }

  /**
   * Controla si está habilitado el modo de dibujo a mano alzada
   * @param {boolean} enabled
   */
  setDrawingMode(enabled) {
    if (!this.canvas) return
    this.canvas.isDrawingMode = enabled
  }

  /**
   * Configura las propiedades del pincel de dibujo
   * @param {string} color - Color HEX
   * @param {number} width - Ancho en píxeles
   */
  setBrushOptions(color, width) {
    if (!this.canvas) return
    if (!this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush = new PencilBrush(this.canvas)
    }
    this.canvas.freeDrawingBrush.color = color
    this.canvas.freeDrawingBrush.width = parseInt(width, 10)
  }

  /**
   * Determina si se muestran controles de selección por defecto
   * @param {boolean} selection
   */
  setSelectionEnabled(selection) {
    if (!this.canvas) return
    this.canvas.selection = selection
  }

  /**
   * Determina el cursor predeterminado del lienzo
   * @param {string} cursor
   */
  setDefaultCursor(cursor) {
    if (!this.canvas) return
    this.canvas.defaultCursor = cursor
    this.canvas.setCursor(cursor)
  }

  /**
   * Registra un callback para eventos de Fabric.js
   * @param {string} eventName
   * @param {Function} callback
   * @returns {Function} Desuscriptor
   */
  on(eventName, callback) {
    if (!this.canvas) return () => {}
    this.canvas.on(eventName, callback)
    return () => {
      this.canvas.off(eventName, callback)
    }
  }

  /**
   * Fuego de eventos personalizados de Fabric.js
   * @param {string} eventName
   * @param {Object} [options]
   */
  fire(eventName, options) {
    if (!this.canvas) return
    this.canvas.fire(eventName, options)
  }

  /**
   * Carga una imagen base asíncronamente desde una URL
   * @param {string} url - Ruta de la imagen
   * @returns {Promise<FabricImage>}
   */
  async loadBackgroundImage(url) {
    if (!this.canvas) return null
    try {
      const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' }, {})
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
        isMapBase: true,
      })
      this.canvas.insertAt(0, img)
      return img
    } catch (err) {
      console.error('FabricAdapter: Error cargando imagen de fondo:', err)
      throw err
    }
  }

  /**
   * Carga un elemento SVG externo (Sticker)
   * @param {string} url
   * @returns {Promise<Object>} Datos del sticker cargado { objects, options }
   */
  async loadSVG(url) {
    try {
      const { objects, options } = await loadSVGFromURL(url)
      return { objects, options }
    } catch (err) {
      console.error('FabricAdapter: Error cargando SVG:', err)
      throw err
    }
  }

  /**
   * Crea un grupo a partir de objetos SVG cargados
   * @param {Array} objects
   * @param {Object} options
   * @returns {Object} Instancia de Group de Fabric
   */
  groupSVGElements(objects, options) {
    return util.groupSVGElements(objects, options)
  }

  /**
   * Genera el Data URL de exportación para el viewport del canvas
   * @param {Object} options
   * @returns {string}
   */
  toDataURL(options = {}) {
    if (!this.canvas) return ''
    return this.canvas.toDataURL(options)
  }

  /**
   * Deserializa los elementos a partir de una lista en JSON
   * @param {Array} jsonObjects
   * @returns {Promise<Array>}
   */
  async enlivenObjects(jsonObjects) {
    return util.enlivenObjects(jsonObjects)
  }

  /**
   * Libera los recursos del lienzo
   */
  dispose() {
    if (this.canvas) {
      this.canvas.dispose()
      this.canvas = null
    }
  }

  /**
   * Verifica si un objeto de imagen posee un tipo de filtro específico.
   * @param {Object} obj
   * @param {string} filterType
   * @returns {boolean}
   */
  hasFilter(obj, filterType) {
    if (!obj || !obj.filters) return false
    const typeMap = {
      grayscale: 'Grayscale',
      invert: 'Invert',
      sepia: 'Sepia',
      brightness: 'Brightness',
      contrast: 'Contrast',
      blur: 'Blur',
    }
    const targetType = typeMap[filterType.toLowerCase()] || filterType
    return obj.filters.some((f) => f.type === targetType)
  }

  /**
   * Aplica o remueve un filtro de imagen a un objeto.
   * @param {Object} obj
   * @param {string} filterType
   * @param {boolean|number} enabledOrVal
   */
  applyFilter(obj, filterType, enabledOrVal) {
    if (!obj) return
    obj.filters = obj.filters || []

    const typeMap = {
      grayscale: 'Grayscale',
      invert: 'Invert',
      sepia: 'Sepia',
      brightness: 'Brightness',
      contrast: 'Contrast',
      blur: 'Blur',
    }
    const targetType = typeMap[filterType.toLowerCase()]

    // Remover filtro existente del mismo tipo
    obj.filters = obj.filters.filter((f) => f.type !== targetType)

    // Instanciar y agregar si está activado
    if (enabledOrVal !== false && enabledOrVal !== 0 && enabledOrVal !== undefined) {
      if (filterType === 'grayscale') {
        obj.filters.push(new filters.Grayscale())
      } else if (filterType === 'invert') {
        obj.filters.push(new filters.Invert())
      } else if (filterType === 'sepia') {
        obj.filters.push(new filters.Sepia())
      } else if (filterType === 'brightness') {
        obj.filters.push(new filters.Brightness({ brightness: enabledOrVal }))
      } else if (filterType === 'contrast') {
        obj.filters.push(new filters.Contrast({ contrast: enabledOrVal }))
      } else if (filterType === 'blur') {
        obj.filters.push(new filters.Blur({ blur: enabledOrVal }))
      }
    }

    obj.applyFilters()
    this.canvas.requestRenderAll()
    this.canvas.fire('object:modified')
  }
}
