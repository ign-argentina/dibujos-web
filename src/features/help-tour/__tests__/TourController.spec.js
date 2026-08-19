import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TourController } from '../TourController.js'

describe('TourController', () => {
  let container
  let mockCanvasManager
  let mockSidebar
  let mockStore
  let sampleTour

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'test-container'
    document.body.appendChild(container)

    // Crear elementos DOM para los targets de prueba
    const el1 = document.createElement('div')
    el1.setAttribute('data-tour', 'target-1')
    el1.getBoundingClientRect = () => ({ left: 50, top: 50, width: 100, height: 40, right: 150, bottom: 90 })
    container.appendChild(el1)

    const el2 = document.createElement('div')
    el2.setAttribute('data-tour', 'target-2')
    el2.getBoundingClientRect = () => ({ left: 200, top: 100, width: 80, height: 40, right: 280, bottom: 140 })
    container.appendChild(el2)

    const el3 = document.createElement('div')
    el3.setAttribute('data-tour', 'target-3')
    el3.getBoundingClientRect = () => ({ left: 350, top: 150, width: 120, height: 50, right: 470, bottom: 200 })
    container.appendChild(el3)

    mockCanvasManager = {
      activeTool: 'brush',
      setTool: vi.fn((tool) => {
        mockCanvasManager.activeTool = tool
      })
    }

    mockSidebar = {
      isOpen: true,
      activeViewId: 'help',
      open: vi.fn(() => {
        mockSidebar.isOpen = true
      }),
      close: vi.fn(() => {
        mockSidebar.isOpen = false
      }),
      switchView: vi.fn((viewId) => {
        mockSidebar.activeViewId = viewId
      })
    }

    mockStore = {
      getState: () => ({ accessibility: { reducedMotion: 'disabled' } })
    }

    sampleTour = {
      id: 'sample',
      version: 1,
      title: 'Tour de Prueba',
      steps: [
        { id: 's1', target: '[data-tour="target-1"]', title: 'Paso 1', text: 'Texto 1', placement: 'bottom' },
        { id: 's2', target: '[data-tour="target-2"]', title: 'Paso 2', text: 'Texto 2', placement: 'top' },
        { id: 's3', target: '[data-tour="target-3"]', title: 'Paso 3', text: 'Texto 3', placement: 'right' }
      ]
    }
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('debería iniciar el tour, suspender herramientas activas a "pan" y capturar snapshot', () => {
    const triggerBtn = document.createElement('button')
    container.appendChild(triggerBtn)
    triggerBtn.focus()

    const controller = new TourController({
      canvasManager: mockCanvasManager,
      sidebar: mockSidebar,
      appStore: mockStore,
      overlayContainer: container
    })

    const started = controller.start(sampleTour, triggerBtn)

    expect(started).toBe(true)
    expect(controller.isRunning()).toBe(true)
    // Herramienta cambiada temporalmente a pan
    expect(mockCanvasManager.setTool).toHaveBeenCalledWith('pan')
    expect(controller.snapshot.activeTool).toBe('brush')
    expect(controller.snapshot.sidebarOpen).toBe(true)
    expect(controller.snapshot.sidebarViewId).toBe('help')
    expect(controller.snapshot.triggerElement).toBe(triggerBtn)

    // Se renderiza el overlay
    expect(container.querySelector('#tour-overlay-root')).not.toBeNull()
    expect(container.querySelector('#tour-step-badge').textContent).toBe('Paso 1 de 3')

    controller.destroy()
  })

  it('no debería permitir iniciar dos tours simultáneos', () => {
    const controller = new TourController({
      canvasManager: mockCanvasManager,
      sidebar: mockSidebar,
      overlayContainer: container
    })

    const start1 = controller.start(sampleTour)
    expect(start1).toBe(true)

    const start2 = controller.start(sampleTour)
    expect(start2).toBe(false)

    controller.destroy()
  })

  it('debería navegar secuencialmente con next() y prev()', () => {
    const controller = new TourController({
      canvasManager: mockCanvasManager,
      sidebar: mockSidebar,
      overlayContainer: container
    })
    controller.start(sampleTour)

    expect(controller.currentIndex).toBe(0)

    // Avanzar a paso 2
    controller.next()
    expect(controller.currentIndex).toBe(1)
    expect(container.querySelector('#tour-step-badge').textContent).toBe('Paso 2 de 3')

    // Avanzar a paso 3
    controller.next()
    expect(controller.currentIndex).toBe(2)
    expect(container.querySelector('#tour-step-badge').textContent).toBe('Paso 3 de 3')

    // Retroceder a paso 2
    controller.prev()
    expect(controller.currentIndex).toBe(1)
    expect(container.querySelector('#tour-step-badge').textContent).toBe('Paso 2 de 3')

    controller.destroy()
  })

  it('al completar el último paso con next(), debería finalizar y restaurar el estado previo', () => {
    const triggerBtn = document.createElement('button')
    container.appendChild(triggerBtn)
    triggerBtn.focus()

    const onEndMock = vi.fn()
    const controller = new TourController({
      canvasManager: mockCanvasManager,
      sidebar: mockSidebar,
      overlayContainer: container,
      onTourEnd: onEndMock
    })

    controller.start(sampleTour, triggerBtn)
    controller.next() // Paso 2
    controller.next() // Paso 3
    controller.next() // Finalizar

    expect(controller.isRunning()).toBe(false)
    expect(container.querySelector('#tour-overlay-root')).toBeNull()
    // Restauró la herramienta original
    expect(mockCanvasManager.setTool).toHaveBeenCalledWith('brush')
    // Restauró el Sidebar
    expect(mockSidebar.switchView).toHaveBeenCalledWith('help')
    expect(mockSidebar.open).toHaveBeenCalled()
    expect(onEndMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'finished' }))
  })

  it('al cerrar con close() o Escape debería restaurar el estado y foco', () => {
    const triggerBtn = document.createElement('button')
    container.appendChild(triggerBtn)
    triggerBtn.focus()

    const onEndMock = vi.fn()
    const controller = new TourController({
      canvasManager: mockCanvasManager,
      sidebar: mockSidebar,
      overlayContainer: container,
      onTourEnd: onEndMock
    })

    controller.start(sampleTour, triggerBtn)
    controller.close()

    expect(controller.isRunning()).toBe(false)
    expect(mockCanvasManager.setTool).toHaveBeenCalledWith('brush')
    expect(onEndMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'closed' }))
  })

  it('debería saltar automáticamente (skip) pasos cuyos targets no existan en el DOM', () => {
    const tourWithMissingStep = {
      id: 'missing-test',
      version: 1,
      title: 'Tour con paso faltante',
      steps: [
        { id: 's1', target: '[data-tour="target-1"]', title: 'P1', text: 'T1', placement: 'bottom' },
        { id: 's-nonexistent', target: '[data-tour="does-not-exist"]', title: 'Inexistente', text: 'T', placement: 'top' },
        { id: 's3', target: '[data-tour="target-3"]', title: 'P3', text: 'T3', placement: 'right' }
      ]
    }

    const controller = new TourController({
      canvasManager: mockCanvasManager,
      sidebar: mockSidebar,
      overlayContainer: container
    })

    controller.start(tourWithMissingStep)
    expect(controller.currentIndex).toBe(0)

    // Al avanzar, salta el paso 1 (índice 1) y va directo al paso 2 (índice 2)
    controller.next()
    expect(controller.currentIndex).toBe(2)
    expect(container.querySelector('#tour-step-title').textContent).toBe('P3')

    // Al retroceder, salta de nuevo el paso inexistente y vuelve al paso 0
    controller.prev()
    expect(controller.currentIndex).toBe(0)
    expect(container.querySelector('#tour-step-title').textContent).toBe('P1')

    controller.destroy()
  })

  it('si todos los pasos son imposibles de resolver, debe cerrarse limpiamente sin errores', () => {
    const emptyTargetsTour = {
      id: 'all-missing',
      version: 1,
      title: 'Sin targets',
      steps: [
        { id: 'm1', target: '[data-tour="non-1"]', title: 'M1', text: 'T', placement: 'bottom' },
        { id: 'm2', target: '[data-tour="non-2"]', title: 'M2', text: 'T', placement: 'top' }
      ]
    }

    const controller = new TourController({
      canvasManager: mockCanvasManager,
      sidebar: mockSidebar,
      overlayContainer: container
    })

    const started = controller.start(emptyTargetsTour)
    expect(started).toBe(false)
    expect(controller.isRunning()).toBe(false)
  })

  it('al iniciar repetidamente siempre debe comenzar desde el paso 1', () => {
    const controller = new TourController({
      canvasManager: mockCanvasManager,
      sidebar: mockSidebar,
      overlayContainer: container
    })

    controller.start(sampleTour)
    controller.next() // Paso 2 (index 1)
    controller.close()

    // Iniciar de nuevo
    controller.start(sampleTour)
    expect(controller.currentIndex).toBe(0)
    expect(container.querySelector('#tour-step-badge').textContent).toBe('Paso 1 de 3')

    controller.destroy()
  })
})
