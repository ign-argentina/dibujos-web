export class AppStore {
  constructor(initialState = {}) {
    this.state = {
      activeMapId: null,
      activeTool: 'select',
      activeColor: '#FFF4B0',
      activeStrokeWidth: 8,
      ...initialState,
    }
    this.listeners = []
  }

  /**
   * Obtener el estado actual (inmutable).
   * @returns {Object}
   */
  getState() {
    return { ...this.state }
  }

  /**
   * Suscribirse a cambios del estado.
   * @param {Function} callback - Función receptora del estado completo.
   * @returns {Function} Función para desuscribirse.
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('El callback de suscripción debe ser una función')
    }
    this.listeners.push(callback)
    // Emitir inmediatamente con el estado actual
    callback(this.getState())

    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback)
    }
  }

  /**
   * Despachar una acción para mutar el estado de manera predecible.
   * @param {Object} action - Acción { type, payload }.
   */
  dispatch(action) {
    if (!action || typeof action.type !== 'string') {
      throw new Error('La acción debe tener una propiedad "type" válida')
    }

    let stateChanged = false
    const nextState = { ...this.state }

    switch (action.type) {
      case 'SET_ACTIVE_MAP_ID':
        if (nextState.activeMapId !== action.payload) {
          nextState.activeMapId = action.payload
          stateChanged = true
        }
        break
      case 'SET_ACTIVE_TOOL':
        if (nextState.activeTool !== action.payload) {
          nextState.activeTool = action.payload
          stateChanged = true
        }
        break
      case 'SET_ACTIVE_COLOR':
        if (nextState.activeColor !== action.payload) {
          nextState.activeColor = action.payload
          stateChanged = true
        }
        break
      case 'SET_ACTIVE_STROKE_WIDTH': {
        const width = parseInt(action.payload, 10)
        if (nextState.activeStrokeWidth !== width) {
          nextState.activeStrokeWidth = width
          stateChanged = true
        }
        break
      }
      default:
        console.warn(`Acción desconocida en el store: ${action.type}`)
    }

    if (stateChanged) {
      this.state = nextState
      this.emit()
    }
  }

  emit() {
    const currentState = this.getState()
    this.listeners.forEach((callback) => {
      try {
        callback(currentState)
      } catch (error) {
        console.error('Error en listener del store:', error)
      }
    })
  }
}

export const appStore = new AppStore()
