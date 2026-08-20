import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CanvasManager } from '../../canvasManager.js'
import { Toolbar } from '../../../features/toolbar/Toolbar.js'
import { Sidebar } from '../../../components/Sidebar.js'
import { appStore } from '../../../state/AppStore.js'
import { createMapStateSubscriber } from '../../../app/bootstrap.js'
import { FabricImage } from 'fabric'

// Mock de Fabric.js adaptado para entorno JSDOM
vi.mock('fabric', () => {
  class MockCanvas {
    constructor() {
      this._objects = []
      this._activeObject = null
      this._listeners = {}
      this.selection = true
      this.skipTargetFind = false
      this.isDrawingMode = false
      this.defaultCursor = 'default'
      this.renderOnAddRemove = true
      this.viewportTransform = [1, 0, 0, 1, 0, 0]

      this.add = vi.fn((obj) => {
        this._objects.push(obj)
      })
      this.insertAt = vi.fn((indexOrObj, objOrIndex) => {
        if (typeof indexOrObj === 'number') {
          this._objects.splice(indexOrObj, 0, objOrIndex)
        } else {
          this._objects.splice(objOrIndex, 0, indexOrObj)
        }
      })
      this.remove = vi.fn((obj) => {
        this._objects = this._objects.filter((o) => o !== obj)
      })
      this.getActiveObject = vi.fn(() => this._activeObject)
      this.setActiveObject = vi.fn((obj) => {
        this._activeObject = obj
      })
      this.discardActiveObject = vi.fn(() => {
        this._activeObject = null
        this.fire('selection:cleared')
      })
      this.getObjects = vi.fn(() => this._objects)
      this.requestRenderAll = vi.fn()
      this.on = vi.fn((event, handler) => {
        this._listeners[event] = this._listeners[event] || []
        this._listeners[event].push(handler)
      })
      this.off = vi.fn((event, handler) => {
        if (this._listeners[event]) {
          this._listeners[event] = this._listeners[event].filter(h => h !== handler)
        }
      })
      this.fire = vi.fn((event, ...args) => {
        if (this._listeners[event]) {
          this._listeners[event].forEach((h) => h(...args))
        }
      })
      this.getZoom = vi.fn().mockReturnValue(1)
      this.zoomToPoint = vi.fn()
      this.setViewportTransform = vi.fn()
      this.setDimensions = vi.fn()
      this.calcOffset = vi.fn()
      this.getScenePoint = vi.fn((e) => ({ x: e.clientX || 0, y: e.clientY || 0 }))
      this.setCursor = vi.fn((cursor) => {
        this.defaultCursor = cursor
      })
      this.dispose = vi.fn()
    }
  }

  class MockFabricImage {
    constructor(img, opts = {}) {
      Object.assign(this, opts)
      this.type = 'image'
      this.isMapBase = true
      this.scaleToWidth = vi.fn()
      this.scaleToHeight = vi.fn()
      this.set = vi.fn((props) => Object.assign(this, props))
      this.setCoords = vi.fn()
      this.toObject = () => ({ type: 'image', isMapBase: true })
    }
  }
  MockFabricImage.fromURL = vi.fn().mockImplementation(() => Promise.resolve(new MockFabricImage()))

  class MockFabricObject {
    constructor(opts = {}) {
      Object.assign(this, opts)
    }
    set(props) {
      Object.assign(this, props)
      return this
    }
    toObject() {
      return { ...this }
    }
  }
  MockFabricObject.ownDefaults = {}

  class MockPencilBrush {
    constructor() {
      this.color = '#000000'
      this.width = 4
    }
  }

  class MockRect {
    constructor(opts = {}) {
      Object.assign(this, opts)
      this.type = 'rect'
      this.setCoords = vi.fn()
    }
    set(props) {
      Object.assign(this, props)
      return this
    }
    toObject() {
      return { ...this }
    }
  }

  class MockCircle {
    constructor(opts = {}) {
      Object.assign(this, opts)
      this.type = 'circle'
      this.setCoords = vi.fn()
    }
    set(props) {
      Object.assign(this, props)
      return this
    }
    toObject() {
      return { ...this }
    }
  }

  class MockPath {
    constructor(path, opts = {}) {
      this.path = path
      Object.assign(this, opts)
      this.type = 'path'
      this.setCoords = vi.fn()
    }
    set(props) {
      Object.assign(this, props)
      return this
    }
    toObject() {
      return { ...this }
    }
  }

  class MockPolyline {
    constructor(points, opts = {}) {
      this.points = points
      Object.assign(this, opts)
      this.type = 'polyline'
      this.setCoords = vi.fn()
    }
    set(props) {
      Object.assign(this, props)
      return this
    }
    toObject() {
      return { ...this }
    }
  }

  class MockPolygon {
    constructor(points, opts = {}) {
      this.points = points
      Object.assign(this, opts)
      this.type = 'polygon'
      this.setCoords = vi.fn()
    }
    set(props) {
      Object.assign(this, props)
      return this
    }
    toObject() {
      return { ...this }
    }
  }

  class MockTextbox {
    constructor(text, opts = {}) {
      this.text = text
      Object.assign(this, opts)
      this.type = 'textbox'
      this._listeners = {}
      this.setCoords = vi.fn()
    }
    set(props) {
      Object.assign(this, props)
      return this
    }
    toObject() {
      return { ...this }
    }
    enterEditing() {
      this.isEditing = true
    }
    exitEditing() {
      this.isEditing = false
      if (this._listeners['editing:exited']) {
        this._listeners['editing:exited'].forEach((cb) => cb())
      }
    }
    selectAll() {}
    on(event, cb) {
      this._listeners[event] = this._listeners[event] || []
      this._listeners[event].push(cb)
    }
    off(event, cb) {
      if (this._listeners[event]) {
        this._listeners[event] = this._listeners[event].filter((h) => h !== cb)
      }
    }
  }

  return {
    Canvas: MockCanvas,
    FabricImage: MockFabricImage,
    FabricObject: MockFabricObject,
    PencilBrush: MockPencilBrush,
    Rect: MockRect,
    Circle: MockCircle,
    Path: MockPath,
    Polyline: MockPolyline,
    Polygon: MockPolygon,
    Textbox: MockTextbox,
    util: {
      parsePath: vi.fn((p) => p),
      enlivenObjects: vi.fn((objectsData) => {
        return Promise.resolve(
          objectsData.map((data) => {
            const obj = { ...data }
            obj.toObject = () => ({ ...obj })
            obj.set = vi.fn((props) => {
              Object.assign(obj, props)
              return obj
            })
            return obj
          })
        )
      }),
    },
  }
})

describe('Tests de Regresión - Activación de Herramientas, Selección y Canvas', () => {
  let container
  let canvasManager
  let sidebarContainer
  let sidebar

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'editor-container'
    document.body.appendChild(container)

    sidebarContainer = document.createElement('aside')
    sidebarContainer.id = 'sidebar-catalog'
    sidebarContainer.className = 'nbi-sidebar'
    sidebarContainer.innerHTML = `
      <div class="nbi-sidebar__tabs"></div>
      <div class="nbi-sidebar__window">
        <button id="close-sidebar-btn"></button>
        <div id="view-maps" class="nbi-sidebar__view"></div>
        <div id="view-accessibility" class="nbi-sidebar__view hidden"></div>
        <div id="view-help" class="nbi-sidebar__view hidden"></div>
      </div>
    `
    document.body.appendChild(sidebarContainer)

    sidebar = new Sidebar(sidebarContainer, {
      views: [
        { id: 'maps', label: 'Mapas' },
        { id: 'accessibility', label: 'Accesibilidad' },
        { id: 'help', label: 'Ayuda' },
      ],
    })
    sidebar.mount()

    canvasManager = new CanvasManager(container)
    canvasManager.init()

    FabricImage.fromURL = vi.fn().mockImplementation(() => Promise.resolve(new FabricImage()))

    appStore.state.activeMapId = null
    appStore.state.activeTool = 'select'
  })

  afterEach(() => {
    canvasManager.dispose()
    sidebar.unmount()
    container.remove()
    sidebarContainer.remove()
    vi.restoreAllMocks()
  })

  // --- A. SIDEBAR ---
  describe('A. Cierre del Sidebar al activar Canvas Tools', () => {
    it('debería cerrar el Sidebar si está abierto al activar cualquier canvas tool desde la Toolbar', () => {
      const toolbarContainer = document.createElement('div')
      toolbarContainer.id = 'toolbar-container'
      toolbarContainer.innerHTML = `
        <button id="tool-pan"></button>
        <button id="tool-select"></button>
        <button id="tool-brush"></button>
        <button id="tool-rect"></button>
        <button id="tool-circle"></button>
        <button id="tool-arrow"></button>
        <button id="tool-polyline"></button>
        <button id="tool-polygon"></button>
        <button id="tool-text"></button>
        <button id="tool-pin"></button>
      `
      document.body.appendChild(toolbarContainer)

      const toolbar = new Toolbar(toolbarContainer, {
        canvasManager,
        sidebar,
      })
      toolbar.mount()

      const canvasTools = [
        'pan',
        'select',
        'brush',
        'rect',
        'circle',
        'arrow',
        'polyline',
        'polygon',
        'text',
        'pin',
      ]

      canvasTools.forEach((toolName) => {
        // Abrir sidebar
        sidebar.open()
        expect(sidebar.isOpen).toBe(true)

        const btn = toolbarContainer.querySelector(`#tool-${toolName}`)
        expect(btn).not.toBeNull()
        btn.click()

        expect(sidebar.isOpen).toBe(false)
        expect(canvasManager.activeTool).toBe(toolName)
      })

      toolbar.unmount()
      toolbarContainer.remove()
    })

    it('no debería fallar ni realizar operaciones redundantes si el Sidebar ya está cerrado', () => {
      sidebar.close()
      expect(sidebar.isOpen).toBe(false)

      const closeSpy = vi.spyOn(sidebar, 'close')

      const toolbarContainer = document.createElement('div')
      toolbarContainer.id = 'toolbar-container'
      toolbarContainer.innerHTML = `<button id="tool-rect"></button>`
      document.body.appendChild(toolbarContainer)

      const toolbar = new Toolbar(toolbarContainer, {
        canvasManager,
        sidebar,
      })
      toolbar.mount()

      const rectBtn = toolbarContainer.querySelector('#tool-rect')
      rectBtn.click()

      expect(closeSpy).not.toHaveBeenCalled()
      expect(sidebar.isOpen).toBe(false)

      toolbar.unmount()
      toolbarContainer.remove()
    })
  })

  // --- B. SELECCIÓN INDIVIDUAL ---
  describe('B. Limpieza de selección individual al activar herramientas de creación', () => {
    it('debería descartar el objeto seleccionado al activar una herramienta de creación', () => {
      const obj = { type: 'rect', set: vi.fn(), toObject: () => ({ type: 'rect' }) }
      canvasManager.canvas.add(obj)
      canvasManager.canvas.setActiveObject(obj)
      expect(canvasManager.canvas.getActiveObject()).toBe(obj)

      canvasManager.setTool('rect')
      expect(canvasManager.canvas.getActiveObject()).toBeNull()
    })
  })

  // --- C. ACTIVE SELECTION ---
  describe('C. Limpieza de ActiveSelection', () => {
    it('debería descartar una selección múltiple al activar una herramienta de creación', () => {
      const activeSelection = {
        type: 'activeSelection',
        forEachObject: vi.fn(),
        set: vi.fn(),
        toObject: () => ({ type: 'activeSelection' }),
      }
      canvasManager.canvas.setActiveObject(activeSelection)
      expect(canvasManager.canvas.getActiveObject()).toBe(activeSelection)

      canvasManager.setTool('circle')
      expect(canvasManager.canvas.getActiveObject()).toBeNull()
    })
  })

  // --- D. SELECTION TOOL EXCEPTION ---
  describe('D. Excepción de SelectionTool', () => {
    it('debería preservar el objeto seleccionado si select ya está activa y se vuelve a pulsar select', () => {
      canvasManager.setTool('select')
      const obj = { type: 'rect', set: vi.fn(), toObject: () => ({ type: 'rect' }) }
      canvasManager.canvas.setActiveObject(obj)

      // Re-seleccionar select
      canvasManager.setTool('select')
      expect(canvasManager.canvas.getActiveObject()).toBe(obj)
    })
  })

  // --- E. TEXTO EN EDICIÓN ---
  describe('E. Texto en edición al cambiar de herramienta', () => {
    it('debería salir de edición guardando el contenido y limpiar la selección al cambiar de herramienta', () => {
      const exitEditingSpy = vi.fn()
      const textbox = {
        type: 'textbox',
        isEditing: true,
        text: 'Mi texto editado',
        exitEditing: exitEditingSpy,
        set: vi.fn(),
        toObject: () => ({ type: 'textbox', text: 'Mi texto editado' }),
      }
      canvasManager.canvas.add(textbox)
      canvasManager.canvas.setActiveObject(textbox)

      canvasManager.setTool('rect')

      expect(exitEditingSpy).toHaveBeenCalled()
      expect(textbox.text).toBe('Mi texto editado')
      expect(canvasManager.canvas.getActiveObject()).toBeNull()
      expect(canvasManager.activeTool).toBe('rect')
    })
  })

  // --- F. REGRESIÓN PRINCIPAL: INMUNIDAD DE OBJETOS EXISTENTES ---
  describe('F. Inmunidad de objetos previos durante la creación', () => {
    it('debería mantener skipTargetFind=true en herramientas de creación para no mover objetos previos', () => {
      const creationTools = ['rect', 'circle', 'arrow', 'polyline', 'polygon', 'text', 'pin']

      creationTools.forEach((tool) => {
        canvasManager.setTool(tool)
        expect(canvasManager.canvas.skipTargetFind).toBe(true)
        expect(canvasManager.canvas.selection).toBe(false)
      })

      // Al volver a select, skipTargetFind debe ser false y selection true
      canvasManager.setTool('select')
      expect(canvasManager.canvas.skipTargetFind).toBe(false)
      expect(canvasManager.canvas.selection).toBe(true)
    })

    it('un objeto previo A debe conservar exactamente sus propiedades al crear B sobre él', () => {
      const objA = {
        type: 'rect',
        left: 100,
        top: 100,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        set: vi.fn((props) => Object.assign(objA, props)),
        toObject: () => ({ ...objA }),
      }
      canvasManager.canvas.add(objA)

      // Activar RectTool
      canvasManager.setTool('rect')
      expect(canvasManager.canvas.skipTargetFind).toBe(true)

      // Simular creación de B en las mismas coordenadas de A
      const toolInstance = canvasManager.toolService.activeTool
      toolInstance.onMouseDown({ e: { clientX: 100, clientY: 100 } })
      toolInstance.onMouseMove({ e: { clientX: 200, clientY: 200 } })
      toolInstance.onMouseUp({ e: { clientX: 200, clientY: 200 } })

      // A debe conservar intactos sus valores originales
      expect(objA.left).toBe(100)
      expect(objA.top).toBe(100)
      expect(objA.scaleX).toBe(1)
      expect(objA.scaleY).toBe(1)
      expect(objA.angle).toBe(0)
    })
  })

  // --- G. CREACIÓN CONTINUA ---
  describe('G. Persistencia de la herramienta de creación (creación continua)', () => {
    it('debería permitir crear múltiples rectángulos consecutivamente sin volver a select', () => {
      canvasManager.setTool('rect')
      const toolInstance = canvasManager.toolService.activeTool

      // Crear figura 1
      toolInstance.onMouseDown({ e: { clientX: 10, clientY: 10 } })
      toolInstance.onMouseMove({ e: { clientX: 50, clientY: 50 } })
      toolInstance.onMouseUp({ e: { clientX: 50, clientY: 50 } })

      expect(canvasManager.activeTool).toBe('rect')
      expect(canvasManager.canvas.getActiveObject()).toBeNull()

      // Crear figura 2
      toolInstance.onMouseDown({ e: { clientX: 60, clientY: 60 } })
      toolInstance.onMouseMove({ e: { clientX: 100, clientY: 100 } })
      toolInstance.onMouseUp({ e: { clientX: 100, clientY: 100 } })

      expect(canvasManager.activeTool).toBe('rect')
      expect(canvasManager.canvas.getActiveObject()).toBeNull()
      expect(canvasManager.canvas.getObjects().length).toBe(2)
    })

    it('debería permitir crear múltiples círculos consecutivamente sin auto-seleccionar', () => {
      canvasManager.setTool('circle')
      const toolInstance = canvasManager.toolService.activeTool

      // Crear círculo 1
      toolInstance.onMouseDown({ e: { clientX: 10, clientY: 10 } })
      toolInstance.onMouseUp({ e: { clientX: 60, clientY: 60 } })

      expect(canvasManager.activeTool).toBe('circle')
      expect(canvasManager.canvas.getActiveObject()).toBeNull()

      // Crear círculo 2
      toolInstance.onMouseDown({ e: { clientX: 70, clientY: 70 } })
      toolInstance.onMouseUp({ e: { clientX: 120, clientY: 120 } })

      expect(canvasManager.activeTool).toBe('circle')
      expect(canvasManager.canvas.getActiveObject()).toBeNull()
      expect(canvasManager.canvas.getObjects().length).toBe(2)
    })
  })

  // --- H. TEXTO CONTINUO ---
  describe('H. Flujo de TextTool', () => {
    it('debería entrar en edición temporal y volver a estar limpio manteniendo TextTool', () => {
      canvasManager.setTool('text')
      const textTool = canvasManager.toolService.activeTool

      let exitCallback = null
      const mockTextbox = {
        type: 'textbox',
        enterEditing: vi.fn(),
        selectAll: vi.fn(),
        set: vi.fn(),
        on: vi.fn((event, cb) => {
          if (event === 'editing:exited') exitCallback = cb
        }),
        off: vi.fn(),
        toObject: () => ({ type: 'textbox' }),
      }

      textTool.previewShape = mockTextbox
      textTool.isDrawing = true
      textTool.startX = 10
      textTool.startY = 10
      textTool.onMouseUp({ e: { clientX: 50, clientY: 50 } })

      expect(mockTextbox.enterEditing).toHaveBeenCalled()
      expect(canvasManager.activeTool).toBe('text')

      // Simular finalización de edición
      if (exitCallback) {
        exitCallback()
      }
      expect(canvasManager.canvas.getActiveObject()).toBeNull()
      expect(canvasManager.activeTool).toBe('text')
    })
  })

  // --- I. SWITCH MULTIPASO CON GEOMETRÍA VÁLIDA ---
  describe('I. Cambio de herramienta con geometría multipaso válida', () => {
    it('debería confirmar Polygon con 3 o más puntos al cambiar explícitamente de herramienta', () => {
      canvasManager.setTool('polygon')
      const polyTool = canvasManager.toolService.activeTool

      polyTool.onMouseDown({ e: { clientX: 10, clientY: 10 } })
      polyTool.onMouseDown({ e: { clientX: 50, clientY: 10 } })
      polyTool.onMouseDown({ e: { clientX: 50, clientY: 50 } })

      expect(polyTool.points.length).toBe(3)

      // Cambiar a RectTool
      canvasManager.setTool('rect')

      expect(canvasManager.canvas.getObjects().length).toBe(1)
      expect(canvasManager.canvas.getObjects()[0].type).toBe('polygon')
      expect(canvasManager.canvas.getActiveObject()).toBeNull()
      expect(canvasManager.activeTool).toBe('rect')
    })

    it('debería confirmar Polyline con 2 o más puntos al cambiar explícitamente de herramienta', () => {
      canvasManager.setTool('polyline')
      const polylineTool = canvasManager.toolService.activeTool

      polylineTool.onMouseDown({ e: { clientX: 10, clientY: 10 } })
      polylineTool.onMouseDown({ e: { clientX: 60, clientY: 60 } })

      expect(polylineTool.points.length).toBe(2)

      // Cambiar a PanTool
      canvasManager.setTool('pan')

      expect(canvasManager.canvas.getObjects().length).toBe(1)
      expect(canvasManager.canvas.getObjects()[0].type).toBe('polyline')
      expect(canvasManager.canvas.getActiveObject()).toBeNull()
      expect(canvasManager.activeTool).toBe('pan')
    })
  })

  // --- J. SWITCH MULTIPASO CON GEOMETRÍA INVÁLIDA ---
  describe('J. Cambio de herramienta con geometría multipaso incompleta', () => {
    it('debería descartar preview de Polygon si tiene menos de 3 puntos y activar la nueva herramienta', () => {
      canvasManager.setTool('polygon')
      const polyTool = canvasManager.toolService.activeTool

      polyTool.onMouseDown({ e: { clientX: 10, clientY: 10 } })
      expect(polyTool.points.length).toBe(1)

      // Cambiar a RectTool
      canvasManager.setTool('rect')

      expect(canvasManager.canvas.getObjects().length).toBe(0)
      expect(canvasManager.activeTool).toBe('rect')
    })
  })

  // --- K. CANCELACIÓN CON ESCAPE ---
  describe('K. Cancelación con tecla Escape', () => {
    it('debería cancelar Polygon en progreso y regresar a Pan al presionar Escape', () => {
      canvasManager.setTool('polygon')
      const polyTool = canvasManager.toolService.activeTool

      polyTool.onMouseDown({ e: { clientX: 10, clientY: 10 } })
      polyTool.onMouseDown({ e: { clientX: 50, clientY: 50 } })

      polyTool.onKeyDown({ key: 'Escape' })

      expect(canvasManager.canvas.getObjects().length).toBe(0)
      expect(canvasManager.activeTool).toBe('pan')
      expect(canvasManager.canvas.skipTargetFind).toBe(true)
    })

    it('debería cancelar Polyline en progreso y regresar a Pan al presionar Escape', () => {
      canvasManager.setTool('polyline')
      const polylineTool = canvasManager.toolService.activeTool

      polylineTool.onMouseDown({ e: { clientX: 10, clientY: 10 } })

      polylineTool.onKeyDown({ key: 'Escape' })

      expect(canvasManager.canvas.getObjects().length).toBe(0)
      expect(canvasManager.activeTool).toBe('pan')
      expect(canvasManager.canvas.skipTargetFind).toBe(true)
    })
  })

  // --- L. HISTORY INVARIANTS ---
  describe('L. Invarianza del HistoryManager', () => {
    it('cambiar de herramienta, deseleccionar y cerrar Sidebar no debe generar entradas de historial', () => {
      canvasManager.historyManager.capture()
      const initialHistoryLength = canvasManager.historyManager.history.length

      // Cambios de herramientas
      canvasManager.setTool('rect')
      canvasManager.setTool('circle')
      canvasManager.setTool('pan')
      canvasManager.setTool('select')

      // Cierre de Sidebar
      sidebar.open()
      sidebar.close()

      // Descarte de selección
      canvasManager.adapter.discardActiveObject()

      expect(canvasManager.historyManager.history.length).toBe(initialHistoryLength)
    })
  })

  // --- M. INTEGRACIÓN UNDO/REDO Y CAMBIO DE HERRAMIENTA CON MAPA ACTIVO ---
  describe('M. Integración completa de Undo/Redo con suscriptor de mapa', () => {
    it('debería preservar el historial completo de Undo/Redo al cambiar de herramienta y ejecutar undo/redo reales', async () => {
      const mockMapRepo = {
        getById: vi.fn().mockResolvedValue({ id: 'mapa-1', imageUrl: 'http://example.com/map.svg' }),
      }
      const mockConfigRepo = {
        getMapImageSource: vi.fn().mockReturnValue('imageUrl'),
      }
      const mockPersistence = {
        load: vi.fn().mockReturnValue(null),
        save: vi.fn(),
        remove: vi.fn(),
      }

      // Conectar el suscriptor real de mapa de bootstrap
      const mapSubscriber = createMapStateSubscriber({
        canvasManager,
        mapRepository: mockMapRepo,
        configRepository: mockConfigRepo,
        persistenceService: mockPersistence,
      })
      const unsubscribe = appStore.subscribe(mapSubscriber)

      const getDrawingObjects = () =>
        canvasManager.canvas
          .getObjects()
          .filter((o) => o.type !== 'image' && !o.isMapBase && o !== canvasManager.currentMapImage)

      // 1. Activar mapa inicial
      appStore.dispatch({ type: 'SET_ACTIVE_MAP_ID', payload: 'mapa-1' })
      await vi.waitFor(() => expect(canvasManager.currentMapUrl).toBe('http://example.com/map.svg'))

      // 2. Crear Objeto A (Rect)
      canvasManager.setTool('rect')
      const rectTool = canvasManager.toolService.activeTool
      rectTool.onMouseDown({ e: { clientX: 10, clientY: 10 } })
      rectTool.onMouseMove({ e: { clientX: 50, clientY: 50 } })
      rectTool.onMouseUp({ e: { clientX: 50, clientY: 50 } })
      expect(getDrawingObjects().length).toBe(1)
      expect(canvasManager.historyManager.history.length).toBe(2)
      expect(canvasManager.historyManager.currentIndex).toBe(1)
      expect(canvasManager.historyManager.canUndo()).toBe(true)

      // 3. Crear Objeto B (Circle)
      canvasManager.setTool('circle')
      const circleTool = canvasManager.toolService.activeTool
      circleTool.onMouseDown({ e: { clientX: 60, clientY: 60 } })
      circleTool.onMouseMove({ e: { clientX: 100, clientY: 100 } })
      circleTool.onMouseUp({ e: { clientX: 100, clientY: 100 } })
      expect(getDrawingObjects().length).toBe(2)
      expect(canvasManager.historyManager.history.length).toBe(3)
      expect(canvasManager.historyManager.currentIndex).toBe(2)

      // 4. Crear Objeto C (Arrow)
      canvasManager.setTool('arrow')
      const arrowTool = canvasManager.toolService.activeTool
      arrowTool.onMouseDown({ e: { clientX: 110, clientY: 110 } })
      arrowTool.onMouseMove({ e: { clientX: 200, clientY: 200 } })
      arrowTool.onMouseUp({ e: { clientX: 200, clientY: 200 } })
      expect(getDrawingObjects().length).toBe(3)
      expect(canvasManager.historyManager.history.length).toBe(4)
      expect(canvasManager.historyManager.currentIndex).toBe(3)

      // 5. Cambiar consecutivamente entre múltiples herramientas
      canvasManager.setTool('rect')
      canvasManager.setTool('circle')
      canvasManager.setTool('pan')
      canvasManager.setTool('select')
      canvasManager.setTool('polygon')
      canvasManager.setTool('rect')

      // Verificar que el historial permanezca absolutamente idéntico
      expect(canvasManager.historyManager.history.length).toBe(4)
      expect(canvasManager.historyManager.currentIndex).toBe(3)
      expect(canvasManager.historyManager.canUndo()).toBe(true)
      expect(canvasManager.historyManager.canRedo()).toBe(false)
      expect(getDrawingObjects().length).toBe(3)

      // 6. Ejecutar Undo real -> debe eliminar C
      await canvasManager.undo()
      expect(canvasManager.historyManager.currentIndex).toBe(2)
      expect(canvasManager.historyManager.canUndo()).toBe(true)
      expect(canvasManager.historyManager.canRedo()).toBe(true)
      expect(getDrawingObjects().length).toBe(2)

      // 7. Ejecutar Undo real -> debe eliminar B
      await canvasManager.undo()
      expect(canvasManager.historyManager.currentIndex).toBe(1)
      expect(canvasManager.historyManager.canUndo()).toBe(true)
      expect(canvasManager.historyManager.canRedo()).toBe(true)
      expect(getDrawingObjects().length).toBe(1)

      // 8. Ejecutar Redo real -> debe restaurar B
      await canvasManager.redo()
      expect(canvasManager.historyManager.currentIndex).toBe(2)
      expect(canvasManager.historyManager.canUndo()).toBe(true)
      expect(canvasManager.historyManager.canRedo()).toBe(true)
      expect(getDrawingObjects().length).toBe(2)

      // 9. Ejecutar Redo real -> debe restaurar C
      await canvasManager.redo()
      expect(canvasManager.historyManager.currentIndex).toBe(3)
      expect(canvasManager.historyManager.canUndo()).toBe(true)
      expect(canvasManager.historyManager.canRedo()).toBe(false)
      expect(getDrawingObjects().length).toBe(3)

      unsubscribe()
    })
  })

  // --- N. TEST CRÍTICO DE RAMA REDO TRAS CAMBIO DE HERRAMIENTA ---
  describe('N. Preservación de rama Redo disponible', () => {
    it('debería mantener canRedo=true y permitir ejecutar Redo tras cambiar de herramienta', async () => {
      const mockMapRepo = {
        getById: vi.fn().mockResolvedValue({ id: 'mapa-1', imageUrl: 'http://example.com/map.svg' }),
      }
      const mockConfigRepo = {
        getMapImageSource: vi.fn().mockReturnValue('imageUrl'),
      }
      const mockPersistence = {
        load: vi.fn().mockReturnValue(null),
        save: vi.fn(),
        remove: vi.fn(),
      }

      const mapSubscriber = createMapStateSubscriber({
        canvasManager,
        mapRepository: mockMapRepo,
        configRepository: mockConfigRepo,
        persistenceService: mockPersistence,
      })
      const unsubscribe = appStore.subscribe(mapSubscriber)

      const getDrawingObjects = () =>
        canvasManager.canvas
          .getObjects()
          .filter((o) => o.type !== 'image' && !o.isMapBase && o !== canvasManager.currentMapImage)

      appStore.dispatch({ type: 'SET_ACTIVE_MAP_ID', payload: 'mapa-1' })
      await vi.waitFor(() => expect(canvasManager.currentMapUrl).toBe('http://example.com/map.svg'))

      // Crear A, B, C
      canvasManager.setTool('rect')
      const rectTool = canvasManager.toolService.activeTool
      rectTool.onMouseDown({ e: { clientX: 10, clientY: 10 } })
      rectTool.onMouseUp({ e: { clientX: 50, clientY: 50 } })

      canvasManager.setTool('circle')
      const circleTool = canvasManager.toolService.activeTool
      circleTool.onMouseDown({ e: { clientX: 60, clientY: 60 } })
      circleTool.onMouseUp({ e: { clientX: 100, clientY: 100 } })

      canvasManager.setTool('rect')
      rectTool.onMouseDown({ e: { clientX: 110, clientY: 110 } })
      rectTool.onMouseUp({ e: { clientX: 150, clientY: 150 } })

      expect(canvasManager.historyManager.history.length).toBe(4)
      expect(canvasManager.historyManager.currentIndex).toBe(3)

      // Ejecutar Undo -> Deshacer C
      await canvasManager.undo()
      expect(canvasManager.historyManager.currentIndex).toBe(2)
      expect(canvasManager.historyManager.canRedo()).toBe(true)
      expect(getDrawingObjects().length).toBe(2)

      // Cambiar de herramienta (Rect -> Circle -> Pan)
      canvasManager.setTool('circle')
      canvasManager.setTool('pan')

      // Redo debe seguir estando disponible
      expect(canvasManager.historyManager.history.length).toBe(4)
      expect(canvasManager.historyManager.currentIndex).toBe(2)
      expect(canvasManager.historyManager.canRedo()).toBe(true)
      expect(canvasManager.historyManager.canUndo()).toBe(true)

      // Ejecutar Redo -> C debe regresar
      await canvasManager.redo()
      expect(canvasManager.historyManager.currentIndex).toBe(3)
      expect(canvasManager.historyManager.canRedo()).toBe(false)
      expect(getDrawingObjects().length).toBe(3)

      unsubscribe()
    })
  })

  // --- O. INMUNIDAD ANTE MUTACIONES DE APPSTORE NO RELACIONADAS CON EL MAPA ---
  describe('O. Inmunidad ante emisiones no relacionadas de AppStore', () => {
    it('mutaciones de accesibilidad, color o grosor no deben recargar mapa ni resetear historial', async () => {
      const mockMapRepo = {
        getById: vi.fn().mockResolvedValue({ id: 'mapa-1', imageUrl: 'http://example.com/map.svg' }),
      }
      const mockConfigRepo = {
        getMapImageSource: vi.fn().mockReturnValue('imageUrl'),
      }
      const mockPersistence = {
        load: vi.fn().mockReturnValue(null),
        save: vi.fn(),
        remove: vi.fn(),
      }

      const mapSubscriber = createMapStateSubscriber({
        canvasManager,
        mapRepository: mockMapRepo,
        configRepository: mockConfigRepo,
        persistenceService: mockPersistence,
      })
      const unsubscribe = appStore.subscribe(mapSubscriber)

      appStore.dispatch({ type: 'SET_ACTIVE_MAP_ID', payload: 'mapa-1' })
      await vi.waitFor(() => expect(canvasManager.currentMapUrl).toBe('http://example.com/map.svg'))

      // Crear objeto A
      canvasManager.setTool('rect')
      const rectTool = canvasManager.toolService.activeTool
      rectTool.onMouseDown({ e: { clientX: 10, clientY: 10 } })
      rectTool.onMouseUp({ e: { clientX: 50, clientY: 50 } })

      const getDrawingObjects = () =>
        canvasManager.canvas
          .getObjects()
          .filter((o) => o.type !== 'image' && !o.isMapBase && o !== canvasManager.currentMapImage)

      expect(canvasManager.historyManager.history.length).toBe(2)
      expect(canvasManager.historyManager.currentIndex).toBe(1)
      expect(getDrawingObjects().length).toBe(1)

      const clearCanvasSpy = vi.spyOn(canvasManager, 'clearCanvas')
      const loadMapSpy = vi.spyOn(canvasManager, 'loadMap')
      const historyClearSpy = vi.spyOn(canvasManager.historyManager, 'clear')

      // Despachar mutaciones de accesibilidad y estilo en AppStore
      appStore.dispatch({
        type: 'SET_ACCESSIBILITY_PREFERENCE',
        payload: { key: 'contrast', value: 'hc-dark' },
      })
      appStore.dispatch({ type: 'SET_ACTIVE_COLOR', payload: '#FF0000' })
      appStore.dispatch({ type: 'SET_ACTIVE_STROKE_WIDTH', payload: 16 })

      // Ninguna llamada de recarga debe producirse
      expect(clearCanvasSpy).not.toHaveBeenCalled()
      expect(loadMapSpy).not.toHaveBeenCalled()
      expect(historyClearSpy).not.toHaveBeenCalled()

      // Historial y objetos intactos
      expect(canvasManager.historyManager.history.length).toBe(2)
      expect(canvasManager.historyManager.currentIndex).toBe(1)
      expect(getDrawingObjects().length).toBe(1)

      unsubscribe()
    })
  })

  // --- P. CAMBIO REAL DE MAPA ---
  describe('P. Comportamiento ante cambio legítimo de mapa', () => {
    it('debería recargar y reiniciar el historial únicamente cuando activeMapId cambia', async () => {
      const mockMapRepo = {
        getById: vi.fn((id) => Promise.resolve({ id, imageUrl: `http://example.com/${id}.svg` })),
      }
      const mockConfigRepo = {
        getMapImageSource: vi.fn().mockReturnValue('imageUrl'),
      }
      const mockPersistence = {
        load: vi.fn().mockReturnValue(null),
        save: vi.fn(),
        remove: vi.fn(),
      }

      const mapSubscriber = createMapStateSubscriber({
        canvasManager,
        mapRepository: mockMapRepo,
        configRepository: mockConfigRepo,
        persistenceService: mockPersistence,
      })
      const unsubscribe = appStore.subscribe(mapSubscriber)

      // Cargar mapa 1
      appStore.dispatch({ type: 'SET_ACTIVE_MAP_ID', payload: 'mapa-1' })
      await vi.waitFor(() => expect(canvasManager.currentMapUrl).toBe('http://example.com/mapa-1.svg'))

      mockMapRepo.getById.mockClear()
      const clearCanvasSpy = vi.spyOn(canvasManager, 'clearCanvas')
      const historyClearSpy = vi.spyOn(canvasManager.historyManager, 'clear')

      // Cambiar legítimamente a mapa 2
      appStore.dispatch({ type: 'SET_ACTIVE_MAP_ID', payload: 'mapa-2' })
      await vi.waitFor(() => {
        expect(mockMapRepo.getById).toHaveBeenCalledWith('mapa-2')
        expect(clearCanvasSpy).toHaveBeenCalledTimes(1)
        expect(historyClearSpy).toHaveBeenCalledTimes(1)
      })

      unsubscribe()
    })
  })

  // --- Q. PREVENCIÓN DE DOBLE CARGA ASÍNCRONA ---
  describe('Q. Prevención de cargas asíncronas concurrentes', () => {
    it('emisiones múltiples no relacionadas durante la carga no deben provocar cargas duplicadas', async () => {
      const mockMapRepo = {
        getById: vi.fn((id) => Promise.resolve({ id, imageUrl: `http://example.com/${id}.svg` })),
      }
      const mockConfigRepo = {
        getMapImageSource: vi.fn().mockReturnValue('imageUrl'),
      }
      const mockPersistence = {
        load: vi.fn().mockReturnValue(null),
        save: vi.fn(),
        remove: vi.fn(),
      }

      const mapSubscriber = createMapStateSubscriber({
        canvasManager,
        mapRepository: mockMapRepo,
        configRepository: mockConfigRepo,
        persistenceService: mockPersistence,
      })
      const unsubscribe = appStore.subscribe(mapSubscriber)

      appStore.dispatch({ type: 'SET_ACTIVE_MAP_ID', payload: 'mapa-A' })
      await vi.waitFor(() => expect(mockMapRepo.getById).toHaveBeenCalledWith('mapa-A'))

      mockMapRepo.getById.mockClear()

      // Emisiones no relacionadas
      appStore.dispatch({
        type: 'SET_ACCESSIBILITY_PREFERENCE',
        payload: { key: 'invertColors', value: true },
      })
      appStore.dispatch({ type: 'SET_ACTIVE_COLOR', payload: '#123456' })

      expect(mockMapRepo.getById).not.toHaveBeenCalled()

      // Cambio a mapa B
      appStore.dispatch({ type: 'SET_ACTIVE_MAP_ID', payload: 'mapa-B' })
      await vi.waitFor(() => expect(mockMapRepo.getById).toHaveBeenCalledWith('mapa-B'))
      expect(mockMapRepo.getById).toHaveBeenCalledTimes(1)

      unsubscribe()
    })
  })

  // --- R. SINCRONIZACIÓN DE COORDENADAS PARA SELECCIÓN POR CLIC ---
  describe('R. Sincronización de coordenadas para selección por clic (Rect, Circle, Pin)', () => {
    it('debería actualizar setCoords al crear un rectángulo para permitir su selección por clic', () => {
      canvasManager.setTool('rect')
      const rectTool = canvasManager.toolService.activeTool

      rectTool.onMouseDown({ e: { clientX: 20, clientY: 20 } })
      rectTool.onMouseMove({ e: { clientX: 160, clientY: 120 } })
      rectTool.onMouseUp({ e: { clientX: 160, clientY: 120 } })

      const objects = canvasManager.canvas.getObjects().filter((o) => o.type === 'rect')
      expect(objects.length).toBe(1)
      const rect = objects[0]

      expect(rect.selectable).toBe(true)
      expect(rect.evented).toBe(true)
      expect(rect.setCoords).toHaveBeenCalled()
    })

    it('debería actualizar setCoords al crear un círculo para permitir su selección por clic', () => {
      canvasManager.setTool('circle')
      const circleTool = canvasManager.toolService.activeTool

      circleTool.onMouseDown({ e: { clientX: 30, clientY: 30 } })
      circleTool.onMouseMove({ e: { clientX: 100, clientY: 100 } })
      circleTool.onMouseUp({ e: { clientX: 100, clientY: 100 } })

      const objects = canvasManager.canvas.getObjects().filter((o) => o.type === 'circle')
      expect(objects.length).toBe(1)
      const circle = objects[0]

      expect(circle.selectable).toBe(true)
      expect(circle.evented).toBe(true)
      expect(circle.setCoords).toHaveBeenCalled()
    })

    it('debería actualizar setCoords al crear un pin/marcador para permitir su selección por clic', () => {
      canvasManager.setTool('pin')
      const pinTool = canvasManager.toolService.activeTool

      pinTool.onMouseDown({ e: { clientX: 40, clientY: 40 } })
      pinTool.onMouseMove({ e: { clientX: 80, clientY: 80 } })
      pinTool.onMouseUp({ e: { clientX: 80, clientY: 80 } })

      const objects = canvasManager.canvas.getObjects().filter((o) => o.type === 'path')
      expect(objects.length).toBe(1)
      const pin = objects[0]

      expect(pin.selectable).toBe(true)
      expect(pin.evented).toBe(true)
      expect(pin.setCoords).toHaveBeenCalled()
    })

    it('debería ejecutar setCoords en todos los objetos del canvas al activar SelectTool', () => {
      // Crear varias figuras
      canvasManager.setTool('rect')
      const rectTool = canvasManager.toolService.activeTool
      rectTool.onMouseDown({ e: { clientX: 10, clientY: 10 } })
      rectTool.onMouseUp({ e: { clientX: 50, clientY: 50 } })

      canvasManager.setTool('circle')
      const circleTool = canvasManager.toolService.activeTool
      circleTool.onMouseDown({ e: { clientX: 60, clientY: 60 } })
      circleTool.onMouseUp({ e: { clientX: 100, clientY: 100 } })

      const rect = canvasManager.canvas.getObjects().find((o) => o.type === 'rect')
      const circle = canvasManager.canvas.getObjects().find((o) => o.type === 'circle')

      rect.setCoords.mockClear()
      circle.setCoords.mockClear()

      // Activar SelectTool
      canvasManager.setTool('select')

      expect(rect.setCoords).toHaveBeenCalled()
      expect(circle.setCoords).toHaveBeenCalled()
      expect(canvasManager.canvas.selection).toBe(true)
      expect(canvasManager.canvas.skipTargetFind).toBe(false)
    })
  })
})
