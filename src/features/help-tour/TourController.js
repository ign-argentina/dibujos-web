import { StepResolver } from './StepResolver.js'
import { TourOverlay } from './TourOverlay.js'
import { generalTour } from './tours/generalTour.js'
import { TourStorage } from './TourStorage.js'

/**
 * Orquestador principal del ciclo de vida de los recorridos guiados.
 * Gestiona:
 * - Inicio, navegación (next, prev), finalización y cancelación del tour
 * - Captura de snapshot previo y restauración del estado de la aplicación
 * - Desactivación y reactivación segura de herramientas interactivas
 * - Salto inteligente (skip) ante elementos no disponibles en el DOM
 * - Retorno de foco al elemento desencadenante
 */
export class TourController {
  /**
   * @param {Object} [options]
   * @param {Object} [options.canvasManager] - Instancia de CanvasManager para pausar/restaurar herramientas
   * @param {Object} [options.sidebar] - Instancia del componente Sidebar
   * @param {Object} [options.appStore] - Instancia de AppStore
   * @param {HTMLElement} [options.overlayContainer] - Contenedor DOM para inyectar el overlay (default document.body)
   * @param {Object} [options.fallbackMap] - Mapa de selectores de respaldo para StepResolver
   * @param {Function} [options.onTourStart] - Callback al iniciar el tour
   * @param {Function} [options.onTourEnd] - Callback al concluir o cerrar el tour
   */
  constructor({
    canvasManager = null,
    sidebar = null,
    appStore = null,
    overlayContainer = typeof document !== 'undefined' ? document.body : null,
    fallbackMap = null,
    onTourStart = null,
    onTourEnd = null
  } = {}) {
    this.canvasManager = canvasManager
    this.sidebar = sidebar
    this.appStore = appStore
    this.overlayContainer = overlayContainer
    this.fallbackMap = fallbackMap
    this.onTourStart = onTourStart
    this.onTourEnd = onTourEnd

    // Estado efímero del controlador
    this.running = false
    this.activeTour = null
    this.currentIndex = -1
    this.snapshot = null
    this.overlay = null
  }

  /**
   * Comprueba si hay un recorrido actualmente en ejecución.
   * @returns {boolean}
   */
  isRunning() {
    return this.running
  }

  /**
   * Inicia el recorrido guiado especificado.
   * @param {Object} [tour=generalTour] - Definición del tour
   * @param {HTMLElement} [triggerElement] - Elemento que disparó el inicio del tour
   * @returns {boolean} true si se inició exitosamente, false en caso contrario
   */
  start(tour = generalTour, triggerElement = null) {
    if (this.running) {
      console.warn('TourController: Ya existe un recorrido activo')
      return false
    }

    if (!tour || !Array.isArray(tour.steps) || tour.steps.length === 0) {
      console.warn('TourController: La definición del tour es inválida o no contiene pasos')
      return false
    }

    // 1. Capturar snapshot del estado previo de la aplicación
    const activeEl =
      triggerElement ||
      (typeof document !== 'undefined' && document.activeElement ? document.activeElement : null)

    this.snapshot = {
      triggerElement: activeEl,
      activeTool: this.canvasManager ? this.canvasManager.activeTool : null,
      sidebarOpen: this.sidebar ? Boolean(this.sidebar.isOpen) : false,
      sidebarViewId: this.sidebar ? this.sidebar.activeViewId : null
    }

    // 2. Suspender herramientas interactivas cambiando temporalmente a 'pan' (seguro y pasivo)
    if (this.canvasManager && typeof this.canvasManager.setTool === 'function') {
      if (this.canvasManager.activeTool !== 'pan') {
        this.canvasManager.setTool('pan')
      }
    }

    this.activeTour = tour
    this.running = true

    // 3. Buscar el primer paso resoluble en el DOM
    const firstIdx = this._findNextResolvableIndex(0)
    if (firstIdx === -1) {
      console.warn('TourController: No se encontraron pasos con targets válidos en el DOM')
      this.close()
      return false
    }

    this.currentIndex = firstIdx
    this._renderCurrentStep()

    if (typeof this.onTourStart === 'function') {
      this.onTourStart(this.activeTour)
    }

    return true
  }

  /**
   * Avanza al siguiente paso válido. Si se llega al final, concluye el tour.
   */
  next() {
    if (!this.running || !this.activeTour) return

    const nextIdx = this._findNextResolvableIndex(this.currentIndex + 1)
    if (nextIdx === -1) {
      this.finish()
    } else {
      this.currentIndex = nextIdx
      this._renderCurrentStep()
    }
  }

  /**
   * Retrocede al paso válido anterior.
   */
  prev() {
    if (!this.running || !this.activeTour || this.currentIndex <= 0) return

    const prevIdx = this._findPrevResolvableIndex(this.currentIndex - 1)
    if (prevIdx !== -1) {
      this.currentIndex = prevIdx
      this._renderCurrentStep()
    }
  }

  /**
   * Finaliza el tour normalmente tras completar el último paso.
   */
  finish() {
    if (!this.running) return
    const tour = this.activeTour

    if (tour && tour.id && typeof tour.version === 'number') {
      try {
        TourStorage.setTourCompleted(tour.id, tour.version)
      } catch (err) {
        console.warn('TourController: Error al guardar estado completado', err)
      }
    }

    this._cleanup()

    if (typeof this.onTourEnd === 'function') {
      this.onTourEnd({ status: 'finished', tour })
    }
  }

  /**
   * Cierra o cancela el recorrido antes de completarlo (ej. botón cerrar, Escape).
   */
  close() {
    if (!this.running) return
    const tour = this.activeTour
    this._cleanup()

    if (typeof this.onTourEnd === 'function') {
      this.onTourEnd({ status: 'closed', tour })
    }
  }

  /**
   * Busca el índice del próximo paso cuyo target pueda resolverse con dimensiones válidas.
   * @private
   */
  _findNextResolvableIndex(fromIndex) {
    if (!this.activeTour || !Array.isArray(this.activeTour.steps)) return -1

    for (let i = fromIndex; i < this.activeTour.steps.length; i++) {
      const step = this.activeTour.steps[i]
      const resolution = StepResolver.resolveTarget(step.target, {
        root: typeof document !== 'undefined' ? document : null,
        fallbackMap: this.fallbackMap
      })

      if (resolution.found) {
        return i
      }
    }

    return -1
  }

  /**
   * Busca el índice del paso anterior resoluble.
   * @private
   */
  _findPrevResolvableIndex(fromIndex) {
    if (!this.activeTour || !Array.isArray(this.activeTour.steps)) return -1

    for (let i = fromIndex; i >= 0; i--) {
      const step = this.activeTour.steps[i]
      const resolution = StepResolver.resolveTarget(step.target, {
        root: typeof document !== 'undefined' ? document : null,
        fallbackMap: this.fallbackMap
      })

      if (resolution.found) {
        return i
      }
    }

    return -1
  }

  /**
   * Renderiza o actualiza el overlay para el paso activo actual.
   * @private
   */
  _renderCurrentStep() {
    const step = this.activeTour.steps[this.currentIndex]
    const resolution = StepResolver.resolveTarget(step.target, {
      root: typeof document !== 'undefined' ? document : null,
      fallbackMap: this.fallbackMap
    })

    const totalSteps = this.activeTour.steps.length

    if (!this.overlay) {
      this.overlay = new TourOverlay(this.overlayContainer || document.body, {
        step,
        targetElement: resolution.element,
        targetRect: resolution.rect,
        stepIndex: this.currentIndex,
        totalSteps,
        onNext: () => this.next(),
        onPrev: () => this.prev(),
        onClose: () => this.close(),
        appStore: this.appStore
      })
      this.overlay.mount()
    } else {
      this.overlay.update({
        step,
        targetElement: resolution.element,
        targetRect: resolution.rect,
        stepIndex: this.currentIndex,
        totalSteps,
        onNext: () => this.next(),
        onPrev: () => this.prev(),
        onClose: () => this.close()
      })
    }
  }

  /**
   * Restaura el estado previo de la aplicación y destruye el overlay.
   * @private
   */
  _cleanup() {
    // 1. Destruir overlay
    if (this.overlay) {
      try {
        this.overlay.unmount()
        this.overlay.destroy()
      } catch (err) {
        console.warn('TourController: Error al desmontar el overlay', err)
      }
      this.overlay = null
    }

    // 2. Restaurar estado de herramientas y Sidebar
    if (this.snapshot) {
      if (this.canvasManager && this.snapshot.activeTool) {
        try {
          if (typeof this.canvasManager.setTool === 'function') {
            this.canvasManager.setTool(this.snapshot.activeTool)
          }
        } catch (err) {
          console.warn('TourController: Error al restaurar herramienta previa', err)
        }
      }

      if (this.sidebar) {
        try {
          if (this.snapshot.sidebarViewId && typeof this.sidebar.switchView === 'function') {
            this.sidebar.switchView(this.snapshot.sidebarViewId)
          }
          if (this.snapshot.sidebarOpen && typeof this.sidebar.open === 'function') {
            this.sidebar.open()
          } else if (!this.snapshot.sidebarOpen && typeof this.sidebar.close === 'function') {
            this.sidebar.close()
          }
        } catch (err) {
          console.warn('TourController: Error al restaurar estado de Sidebar', err)
        }
      }

      // 3. Restaurar foco al elemento desencadenante
      if (this.snapshot.triggerElement && typeof this.snapshot.triggerElement.focus === 'function') {
        try {
          this.snapshot.triggerElement.focus()
        } catch {
          // Ignorar si el elemento ya no está disponible
        }
      }
    }

    // 4. Limpiar estado interno
    this.running = false
    this.activeTour = null
    this.currentIndex = -1
    this.snapshot = null
  }

  /**
   * Destruye el controlador y asegura la limpieza completa de recursos.
   */
  destroy() {
    if (this.running) {
      this.close()
    }
  }
}
