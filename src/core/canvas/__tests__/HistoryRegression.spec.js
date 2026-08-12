import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { CanvasManager } from '../../canvasManager.js'

// Mock del módulo fabric completo para soportar JSDOM en vitest
vi.mock('fabric', () => {
  class MockCanvas {
    constructor() {
      this.add = vi.fn((obj) => {
        this._objects.push(obj)
      })
      this.insertAt = vi.fn((obj, index) => {
        this._objects.splice(index, 0, obj)
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
      })
      this.getObjects = vi.fn(() => this._objects)
      this.bringObjectToFront = vi.fn((obj) => {
        const idx = this._objects.indexOf(obj)
        if (idx !== -1) {
          this._objects.splice(idx, 1)
          this._objects.push(obj)
        }
      })
      this.sendObjectToBack = vi.fn((obj) => {
        const idx = this._objects.indexOf(obj)
        if (idx !== -1) {
          this._objects.splice(idx, 1)
          this._objects.unshift(obj)
        }
      })
      this.moveTo = vi.fn((obj, index) => {
        const idx = this._objects.indexOf(obj)
        if (idx !== -1) {
          this._objects.splice(idx, 1)
        }
        this._objects.splice(index, 0, obj)
      })
      this.requestRenderAll = vi.fn()
      this.on = vi.fn((event, handler) => {
        this._listeners[event] = this._listeners[event] || []
        this._listeners[event].push(handler)
      })
      this.off = vi.fn()
      this.fire = vi.fn((event, ...args) => {
        if (this._listeners[event]) {
          this._listeners[event].forEach((h) => h(...args))
        }
      })
      this._objects = []
      this._activeObject = null
      this._listeners = {}
      this.renderOnAddRemove = true
      this.getZoom = vi.fn().mockReturnValue(1)
      this.zoomToPoint = vi.fn()
      this.viewportTransform = [1, 0, 0, 1, 0, 0]
      this.setViewportTransform = vi.fn()
      this.setDimensions = vi.fn()
      this.calcOffset = vi.fn()
      this.getScenePoint = vi.fn().mockReturnValue({ x: 10, y: 20 })
      this.setCursor = vi.fn()
      this.dispose = vi.fn()
    }
  }

  class MockFabricImage {
    constructor() {
      this.set = vi.fn()
    }
  }
  MockFabricImage.fromURL = vi.fn().mockResolvedValue(new MockFabricImage())

  class MockFabricObject {}
  MockFabricObject.ownDefaults = {}

  class MockPencilBrush {}

  return {
    Canvas: MockCanvas,
    FabricImage: MockFabricImage,
    FabricObject: MockFabricObject,
    PencilBrush: MockPencilBrush,
    util: {
      enlivenObjects: vi.fn((objectsData) => {
        const enlivened = objectsData.map((data) => {
          return {
            ...data,
            toObject: () => data,
            set: vi.fn((props) => {
              Object.assign(data, props)
            }),
            clone: vi.fn().mockImplementation(function() {
              return Promise.resolve({
                ...this,
                toObject: () => ({ ...data })
              })
            })
          }
        })
        return Promise.resolve(enlivened)
      }),
    },
  }
})

describe('Historial Undo/Redo - Caracterización e Integración', () => {
  let container
  let canvasManager
  let undoBtn
  let redoBtn
  let addedListeners = []
  const originalAdd = window.addEventListener

  beforeAll(() => {
    // Interceptar addEventListener en window para evitar fugas de listeners entre tests
    window.addEventListener = (type, handler, options) => {
      addedListeners.push({ type, handler, options })
      originalAdd(type, handler, options)
    }
  })

  afterAll(() => {
    window.addEventListener = originalAdd
  })

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)

    // Crear elementos de botón del DOM que HistoryManager requiere actualizar
    undoBtn = document.createElement('button')
    undoBtn.id = 'action-undo'
    redoBtn = document.createElement('button')
    redoBtn.id = 'action-redo'
    document.body.appendChild(undoBtn)
    document.body.appendChild(redoBtn)

    canvasManager = new CanvasManager(container)
    canvasManager.init()

    // Sobrescribir undo y redo para retornar la promesa de HistoryManager durante los tests
    canvasManager.undo = () => canvasManager.historyManager.undo()
    canvasManager.redo = () => canvasManager.historyManager.redo()

    // Establecer estado inicial vacío capturado
    canvasManager.historyManager.capture()
  })

  afterEach(() => {
    canvasManager.historyManager.clear()
    container.remove()
    undoBtn.remove()
    redoBtn.remove()

    // Limpiar event listeners vinculados a window durante el test
    addedListeners.forEach(({ type, handler, options }) => {
      window.removeEventListener(type, handler, options)
    })
    addedListeners = []
    vi.restoreAllMocks()
  })

  it('debería registrar un estado inicial vacío y mantener los botones deshabilitados', () => {
    expect(canvasManager.canvas.getObjects().length).toBe(0)
    expect(canvasManager.historyManager.canUndo()).toBe(false)
    expect(canvasManager.historyManager.canRedo()).toBe(false)
    expect(undoBtn.disabled).toBe(true)
    expect(redoBtn.disabled).toBe(true)
  })

  it('debería deshacer y rehacer correctamente la creación de un objeto', async () => {
    // 1. Agregar objeto y registrar
    const rect = {
      type: 'rect',
      fill: '#000000',
      toObject: () => ({ type: 'rect', fill: '#000000' }),
      set: vi.fn(),
    }
    canvasManager.canvas.add(rect)
    canvasManager.canvas.fire('object:modified')

    expect(canvasManager.canvas.getObjects().length).toBe(1)
    expect(canvasManager.historyManager.canUndo()).toBe(true)
    expect(undoBtn.disabled).toBe(false)

    // 2. Deshacer creación
    await canvasManager.undo()

    expect(canvasManager.canvas.getObjects().length).toBe(0)
    expect(canvasManager.historyManager.canUndo()).toBe(false)
    expect(canvasManager.historyManager.canRedo()).toBe(true)
    expect(undoBtn.disabled).toBe(true)
    expect(redoBtn.disabled).toBe(false)

    // 3. Rehacer creación
    await canvasManager.redo()
    expect(canvasManager.canvas.getObjects().length).toBe(1)
    expect(canvasManager.canvas.getObjects()[0].type).toBe('rect')
    expect(canvasManager.historyManager.canUndo()).toBe(true)
    expect(canvasManager.historyManager.canRedo()).toBe(false)
  })

  it('debería deshacer y rehacer el borrado de un objeto (DeleteCommand)', async () => {
    // 1. Añadir objeto inicial
    const rect = {
      type: 'rect',
      fill: '#000000',
      toObject: () => ({ type: 'rect', fill: '#000000' }),
      set: vi.fn(),
    }
    canvasManager.canvas.add(rect)
    canvasManager.canvas.setActiveObject(rect)
    canvasManager.historyManager.capture() // Captura estado con 1 objeto

    // 2. Ejecutar Delete
    canvasManager.deleteSelected()
    expect(canvasManager.canvas.getObjects().length).toBe(0)

    // 3. Deshacer Delete
    await canvasManager.undo()
    expect(canvasManager.canvas.getObjects().length).toBe(1)

    // 4. Rehacer Delete
    await canvasManager.redo()
    expect(canvasManager.canvas.getObjects().length).toBe(0)
  })

  it('debería deshacer y rehacer la duplicación de un objeto (DuplicateCommand)', async () => {
    // 1. Añadir objeto inicial
    const rect = {
      type: 'rect',
      left: 10,
      top: 10,
      toObject: () => ({ type: 'rect', left: 10, top: 10 }),
      set: vi.fn(),
      clone: function() {
        return Promise.resolve({
          ...this,
          left: this.left + 20,
          top: this.top + 20,
          toObject: () => ({ type: 'rect', left: 30, top: 30 })
        })
      }
    }
    canvasManager.canvas.add(rect)
    canvasManager.canvas.setActiveObject(rect)
    canvasManager.historyManager.capture()

    // 2. Ejecutar Duplicación
    await canvasManager.duplicateSelected()
    expect(canvasManager.canvas.getObjects().length).toBe(2)

    // 3. Deshacer Duplicación
    await canvasManager.undo()
    expect(canvasManager.canvas.getObjects().length).toBe(1)

    // 4. Rehacer Duplicación
    await canvasManager.redo()
    expect(canvasManager.canvas.getObjects().length).toBe(2)
  })

  it('debería deshacer y rehacer la limpieza del lienzo (ClearCommand)', async () => {
    // 1. Agregar múltiples objetos
    const obj1 = { type: 'rect', toObject: () => ({ type: 'rect' }), set: vi.fn() }
    const obj2 = { type: 'circle', toObject: () => ({ type: 'circle' }), set: vi.fn() }
    canvasManager.canvas.add(obj1)
    canvasManager.canvas.add(obj2)
    canvasManager.historyManager.capture()

    // 2. Limpiar
    canvasManager.clearCanvas()
    expect(canvasManager.canvas.getObjects().length).toBe(0)

    // 3. Deshacer Limpieza
    await canvasManager.undo()
    expect(canvasManager.canvas.getObjects().length).toBe(2)

    // 4. Rehacer Limpieza
    await canvasManager.redo()
    expect(canvasManager.canvas.getObjects().length).toBe(0)
  })

  it('debería mantener el mapa base al fondo al enviar un objeto al fondo con sendToBack', () => {
    // 1. Crear mapa base (índice 0)
    const mapBase = { isMapBase: true, type: 'image' }
    canvasManager.canvas.add(mapBase)
    canvasManager.currentMapImage = mapBase

    // 2. Agregar objeto de usuario
    const rect = { type: 'rect', toObject: () => ({ type: 'rect' }), set: vi.fn() }
    canvasManager.canvas.add(rect)
    canvasManager.canvas.setActiveObject(rect)

    // Los objetos iniciales deben estar [mapBase, rect]
    expect(canvasManager.canvas.getObjects()[0]).toBe(mapBase)
    expect(canvasManager.canvas.getObjects()[1]).toBe(rect)

    // 3. Enviar objeto al fondo (sendToBack)
    canvasManager.sendToBack()

    // 4. El mapa base debe seguir estando en la posición 0 y el objeto en la 1 sobre el mapa
    expect(canvasManager.canvas.getObjects()[0]).toBe(mapBase)
    expect(canvasManager.canvas.getObjects()[1]).toBe(rect)
  })

  it('debería deshacer y rehacer la modificación de propiedades de un objeto', async () => {
    // 1. Crear e insertar objeto
    const rect = {
      type: 'rect',
      fill: '#FF0000',
      toObject: function() { return { type: 'rect', fill: this.fill } },
      set: function(props) { Object.assign(this, props) }
    }
    canvasManager.canvas.add(rect)
    canvasManager.historyManager.capture() // captura #0: rojo

    // 2. Cambiar propiedad y simular evento modified
    rect.fill = '#0000FF'
    canvasManager.canvas.fire('object:modified') // captura #1: azul

    expect(canvasManager.canvas.getObjects()[0].fill).toBe('#0000FF')

    // 3. Deshacer modificación
    await canvasManager.undo()
    expect(canvasManager.canvas.getObjects()[0].fill).toBe('#FF0000')

    // 4. Rehacer modificación
    await canvasManager.redo()
    expect(canvasManager.canvas.getObjects()[0].fill).toBe('#0000FF')
  })

  it('debería gestionar correctamente una secuencia de múltiples acciones', async () => {
    // A -> B -> C
    const obj1 = { type: 'rect', toObject: () => ({ type: 'rect' }), set: vi.fn() }
    canvasManager.canvas.add(obj1)
    canvasManager.canvas.fire('object:modified') // index 1

    const obj2 = { type: 'circle', toObject: () => ({ type: 'circle' }), set: vi.fn() }
    canvasManager.canvas.add(obj2)
    canvasManager.canvas.fire('object:modified') // index 2

    expect(canvasManager.canvas.getObjects().length).toBe(2)

    // Deshacer una vez -> queda 1 objeto
    await canvasManager.undo()
    expect(canvasManager.canvas.getObjects().length).toBe(1)

    // Deshacer otra vez -> queda 0 objetos (estado inicial)
    await canvasManager.undo()
    expect(canvasManager.canvas.getObjects().length).toBe(0)

    // Rehacer una vez -> vuelve a 1 objeto
    await canvasManager.redo()
    expect(canvasManager.canvas.getObjects().length).toBe(1)

    // Rehacer otra vez -> vuelve a 2 objetos
    await canvasManager.redo()
    expect(canvasManager.canvas.getObjects().length).toBe(2)
  })

  it('debería invalidar la pila de Rehacer (redo) al realizar una nueva acción tras un deshacer', async () => {
    // 1. Estado 0 (inicial, vacío)
    // 2. Agregar Rect y capturar (Estado 1)
    const rect = { type: 'rect', toObject: () => ({ type: 'rect' }), set: vi.fn() }
    canvasManager.canvas.add(rect)
    canvasManager.canvas.fire('object:modified')

    // 3. Deshacer -> volvemos al Estado 0
    await canvasManager.undo()
    expect(canvasManager.historyManager.canRedo()).toBe(true)

    // 4. Agregar Círculo (Nueva Acción) y capturar (Estado 1 nuevo)
    const circle = { type: 'circle', toObject: () => ({ type: 'circle' }), set: vi.fn() }
    canvasManager.canvas.add(circle)
    canvasManager.canvas.fire('object:modified')

    // 5. El redo debería invalidarse
    expect(canvasManager.historyManager.canRedo()).toBe(false)
    expect(redoBtn.disabled).toBe(true)

    // Al deshacer ahora, debe volverse a vaciar el canvas
    await canvasManager.undo()
    expect(canvasManager.canvas.getObjects().length).toBe(0)
  })

  it('debería limpiar el historial completamente cuando se cambia de mapa o se llama a clear', () => {
    const rect = { type: 'rect', toObject: () => ({ type: 'rect' }), set: vi.fn() }
    canvasManager.canvas.add(rect)
    canvasManager.canvas.fire('object:modified')

    expect(canvasManager.historyManager.canUndo()).toBe(true)

    // Simular cambio de mapa
    canvasManager.historyManager.clear()

    expect(canvasManager.historyManager.canUndo()).toBe(false)
    expect(canvasManager.historyManager.canRedo()).toBe(false)
    expect(canvasManager.historyManager.history.length).toBe(0)
  })

  it('debería responder a los atajos de teclado Ctrl+Z y Ctrl+Y para Deshacer y Rehacer', () => {
    const undoSpy = vi.spyOn(canvasManager, 'undo')
    const redoSpy = vi.spyOn(canvasManager, 'redo')

    // Simular Ctrl+Z keydown
    const eventZ = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
    })
    window.dispatchEvent(eventZ)
    expect(undoSpy).toHaveBeenCalledTimes(1)

    // Simular Ctrl+Y keydown
    const eventY = new KeyboardEvent('keydown', {
      key: 'y',
      ctrlKey: true,
      bubbles: true,
    })
    window.dispatchEvent(eventY)
    expect(redoSpy).toHaveBeenCalledTimes(1)
  })
})
