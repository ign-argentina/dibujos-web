import { persistenceService } from '../core/persistence/PersistenceService.js'

export const DEFAULT_ACCESSIBILITY = {
  textScale: 'default',        // 'default' | 'large' | 'xlarge'
  accessibleFont: false,       // boolean
  lineHeight: 'default',       // 'default' | 'medium' | 'double'
  horizontalSpacing: 'default', // 'default' | 'medium' | 'large'
  invertColors: false,         // boolean
  grayscale: false,            // boolean
  saturation: 'default',       // 'default' | 'reduced' | 'increased'
  contrast: 'default',         // 'default' | 'hc-dark' | 'hc-light'
  largeCursor: false,          // boolean
  reducedMotion: 'system',     // 'system' | 'enabled' | 'disabled' (tri-state)
  daltonism: 'none'            // 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
}

export class AppStore {
  constructor(initialState = {}) {
    const savedAccessibility = this.loadFromPersistence()

    this.state = {
      activeMapId: null,
      activeTool: 'select',
      activeColor: '#FFF4B0',
      activeStrokeWidth: 8,
      ...initialState,
      accessibility: {
        ...savedAccessibility,
        ...(initialState.accessibility || {})
      }
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
      case 'SET_ACCESSIBILITY_PREFERENCE': {
        const { key, value } = action.payload || {}
        const validations = {
          textScale: ['default', 'large', 'xlarge'],
          accessibleFont: [true, false],
          lineHeight: ['default', 'medium', 'double'],
          horizontalSpacing: ['default', 'medium', 'large'],
          invertColors: [true, false],
          grayscale: [true, false],
          saturation: ['default', 'reduced', 'increased'],
          contrast: ['default', 'hc-dark', 'hc-light'],
          largeCursor: [true, false],
          reducedMotion: ['system', 'enabled', 'disabled'],
          daltonism: ['none', 'protanopia', 'deuteranopia', 'tritanopia']
        }

        if (key in validations && validations[key].includes(value)) {
          const nextAccessibility = {
            ...nextState.accessibility,
            [key]: value
          }
          const compliantAccessibility = this.applyCompatibilityRules(nextAccessibility, key)

          if (JSON.stringify(nextState.accessibility) !== JSON.stringify(compliantAccessibility)) {
            nextState.accessibility = compliantAccessibility
            stateChanged = true
            this.saveToPersistence(nextState.accessibility)
          }
        } else {
          console.warn(`AppStore: Preferencia o valor inválido de accesibilidad: ${key}=${value}`)
        }
        break
      }
      case 'RESET_ACCESSIBILITY': {
        if (JSON.stringify(nextState.accessibility) !== JSON.stringify(DEFAULT_ACCESSIBILITY)) {
          nextState.accessibility = { ...DEFAULT_ACCESSIBILITY }
          stateChanged = true
          try {
            persistenceService.remove('ign_accessibility_settings')
          } catch (e) {
            console.error('AppStore: Error al limpiar persistencia de accesibilidad:', e)
          }
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

  /**
   * Carga las preferencias de accesibilidad desde el almacenamiento.
   * @returns {Object} Preferencias cargadas o predeterminadas.
   */
  loadFromPersistence() {
    try {
      const serialized = persistenceService.load('ign_accessibility_settings')
      if (serialized) {
        const parsed = JSON.parse(serialized)
        if (parsed && parsed.version === 1 && typeof parsed.settings === 'object') {
          return this.validateAndMigrateSettings(parsed.settings)
        }
      }
    } catch (e) {
      console.error('AppStore: Error cargando preferencias de accesibilidad:', e)
    }
    return { ...DEFAULT_ACCESSIBILITY }
  }

  /**
   * Guarda las preferencias de accesibilidad en el almacenamiento.
   * @param {Object} accessibilitySettings
   */
  saveToPersistence(accessibilitySettings) {
    try {
      const data = {
        version: 1,
        settings: accessibilitySettings
      }
      persistenceService.save('ign_accessibility_settings', JSON.stringify(data))
    } catch (e) {
      console.error('AppStore: Error guardando preferencias de accesibilidad:', e)
    }
  }

  /**
   * Valida cada una de las claves y valores recuperados.
   * @param {Object} settings
   * @returns {Object}
   */
  validateAndMigrateSettings(settings) {
    const validated = { ...DEFAULT_ACCESSIBILITY }
    if (!settings || typeof settings !== 'object') {
      return validated
    }

    const validations = {
      textScale: ['default', 'large', 'xlarge'],
      accessibleFont: [true, false],
      lineHeight: ['default', 'medium', 'double'],
      horizontalSpacing: ['default', 'medium', 'large'],
      invertColors: [true, false],
      grayscale: [true, false],
      saturation: ['default', 'reduced', 'increased'],
      contrast: ['default', 'hc-dark', 'hc-light'],
      largeCursor: [true, false],
      reducedMotion: ['system', 'enabled', 'disabled'],
      daltonism: ['none', 'protanopia', 'deuteranopia', 'tritanopia']
    }

    Object.keys(validations).forEach((key) => {
      if (key in settings) {
        const value = settings[key]
        if (validations[key].includes(value)) {
          validated[key] = value
        }
      }
    })

    return this.applyCompatibilityRules(validated)
  }

  /**
   * Aplica las reglas lógicas de compatibilidad entre filtros visuales.
   * @param {Object} settings
   * @param {string|null} updatedKey
   * @returns {Object}
   */
  applyCompatibilityRules(settings, updatedKey = null) {
    const nextSettings = { ...settings }

    if (updatedKey) {
      // Si sabemos qué clave cambió, esa tiene prioridad absoluta
      if (updatedKey === 'invertColors' && nextSettings.invertColors) {
        nextSettings.grayscale = false
        nextSettings.daltonism = 'none'
      } else if (updatedKey === 'grayscale' && nextSettings.grayscale) {
        nextSettings.invertColors = false
        nextSettings.daltonism = 'none'
        nextSettings.contrast = 'default'
      } else if (updatedKey === 'daltonism' && nextSettings.daltonism !== 'none') {
        nextSettings.invertColors = false
        nextSettings.grayscale = false
      } else if (updatedKey === 'contrast' && nextSettings.contrast !== 'default') {
        nextSettings.grayscale = false
      }
    } else {
      // Prioridad estática para resolver inconsistencias (ej: al cargar de persistencia)
      // 1. Invertir colores
      if (nextSettings.invertColors) {
        nextSettings.grayscale = false
        nextSettings.daltonism = 'none'
      }
      // 2. Escala de grises (solo si no se invirtieron colores)
      if (nextSettings.grayscale) {
        nextSettings.invertColors = false
        nextSettings.daltonism = 'none'
        nextSettings.contrast = 'default'
      }
      // 3. Daltonismo
      if (nextSettings.daltonism !== 'none' && (nextSettings.invertColors || nextSettings.grayscale)) {
        nextSettings.daltonism = 'none'
      }
      // 4. Contraste
      if (nextSettings.contrast !== 'default' && nextSettings.grayscale) {
        nextSettings.contrast = 'default'
      }
    }

    return nextSettings
  }
}

export const appStore = new AppStore()
