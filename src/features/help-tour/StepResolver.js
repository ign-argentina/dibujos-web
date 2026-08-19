/**
 * Mapa de selectores de respaldo para targets primarios basados en atributos semánticos.
 */
export const DEFAULT_FALLBACK_MAP = {
  '[data-tour="navbar"]': '#navbar',
  '[data-tour="sidebar-maps"]': '#tab-maps',
  '[data-tour="canvas-area"]': '.canvas-root',
  '[data-tour="tool-brush"]': '#tool-brush',
  '[data-tour="tool-stickers"]': '#tool-stickers',
  '[data-tour="properties-panel"]': '#properties-panel',
  '[data-tour="action-export"]': '#action-export',
  '[data-tour="sidebar-tabs"]': '.nbi-sidebar__tabs'
}

const CANVAS_TARGET_SELECTOR = '[data-tour="canvas-area"]'
const CANVAS_ALTERNATIVE_SELECTORS = [
  '.canvas-root',
  '.fabric-canvas-wrapper',
  '.canvas-container',
  '.fabric-canvas',
  '#main-content'
]

/**
 * Servicio puro de resolución de targets del recorrido guiado.
 * No muta las secuencias originales y maneja casos de elementos inexistentes,
 * con dimensión cero o con selectores de respaldo.
 */
export class StepResolver {
  /**
   * Resuelve un selector de target en el DOM y comprueba su visibilidad dimensional.
   * @param {string} targetSelector - Selector CSS principal (ej. '[data-tour="navbar"]')
   * @param {Object} [options]
   * @param {ParentNode} [options.root] - Nodo raíz de búsqueda (por defecto document)
   * @param {Object} [options.fallbackMap] - Mapa personalizado de selectores fallback
   * @returns {{ found: boolean, element: HTMLElement|null, rect: DOMRect|null, status: 'resolved'|'zero_dimension'|'not_found' }}
   */
  static resolveTarget(targetSelector, options = {}) {
    if (!targetSelector || typeof targetSelector !== 'string') {
      return { found: false, element: null, rect: null, status: 'not_found' }
    }

    const root = options.root || (typeof document !== 'undefined' ? document : null)
    if (!root || typeof root.querySelector !== 'function') {
      return { found: false, element: null, rect: null, status: 'not_found' }
    }

    const fallbackMap = options.fallbackMap || DEFAULT_FALLBACK_MAP

    let element = root.querySelector(targetSelector)
    const selectors = []

    if (targetSelector === CANVAS_TARGET_SELECTOR) {
      selectors.push(fallbackMap[targetSelector], ...CANVAS_ALTERNATIVE_SELECTORS)
    } else if (!element && fallbackMap[targetSelector]) {
      selectors.push(fallbackMap[targetSelector])
    }

    const getRect = (candidate) => {
      if (typeof candidate.getBoundingClientRect === 'function') {
        return candidate.getBoundingClientRect()
      }

      return null
    }

    const hasDimensions = (candidate, rect) => (
      rect
        ? rect.width > 0 || rect.height > 0
        : (candidate.offsetWidth || 0) > 0 || (candidate.offsetHeight || 0) > 0
    )

    let rect = element ? getRect(element) : null

    // El canvas interno de Fabric puede tener altura cero; en ese caso se
    // busca su contenedor visual, que sí representa toda el área de trabajo.
    if (!element || (targetSelector === CANVAS_TARGET_SELECTOR && !hasDimensions(element, rect))) {
      for (const selector of selectors) {
        if (!selector) continue
        const candidate = root.querySelector(selector)
        const candidateRect = candidate ? getRect(candidate) : null

        if (candidate && hasDimensions(candidate, candidateRect)) {
          element = candidate
          rect = candidateRect
          break
        }
      }
    }

    if (!element) {
      return { found: false, element: null, rect: null, status: 'not_found' }
    }

    if (!hasDimensions(element, rect)) {
      return { found: false, element, rect, status: 'zero_dimension' }
    }

    return { found: true, element, rect, status: 'resolved' }
  }

  /**
   * Resuelve un paso específico sin mutar el objeto original.
   * @param {Object} step - Objeto de paso declarativo
   * @param {Object} [options]
   * @returns {Object} Copia del paso con metadatos de resolución
   */
  static resolveStep(step, options = {}) {
    if (!step || typeof step !== 'object') {
      return {
        id: 'invalid',
        title: '',
        text: '',
        target: '',
        placement: 'bottom',
        resolution: { found: false, element: null, rect: null, status: 'not_found' }
      }
    }

    const resolution = this.resolveTarget(step.target, options)
    return {
      ...step,
      resolution
    }
  }

  /**
   * Resuelve una definición completa de tour produciendo un nuevo objeto sin mutación.
   * @param {Object} tour - Objeto declarativo de tour
   * @param {Object} [options]
   * @returns {Object} Nuevo objeto de tour con steps resueltos
   */
  static resolveTour(tour, options = {}) {
    if (!tour || !Array.isArray(tour.steps)) {
      return { id: '', version: 1, title: '', steps: [] }
    }

    const resolvedSteps = tour.steps.map((step) => this.resolveStep(step, options))
    return {
      ...tour,
      steps: resolvedSteps
    }
  }

  /**
   * Determina si un paso resuelto debe omitirse de forma segura.
   * @param {Object} stepOrResolution - Objeto devuelto por resolveTarget o resolveStep
   * @returns {boolean}
   */
  static shouldSkipStep(stepOrResolution) {
    if (!stepOrResolution) return true
    const resolution = stepOrResolution.resolution || stepOrResolution
    return !resolution.found
  }
}
