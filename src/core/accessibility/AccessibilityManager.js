/**
 * Manager encargado de aplicar reactivamente las preferencias de accesibilidad
 * no cromáticas al documento HTML mediante atributos de datos (data-*).
 */
export class AccessibilityManager {
  /**
   * @param {Object} store - Instancia de AppStore
   */
  constructor(store) {
    if (!store) {
      throw new TypeError('AccessibilityManager requiere una instancia del store')
    }
    this.store = store
    this.unsubscribe = null
  }

  /**
   * Inicializa la suscripción al store para aplicar los cambios en tiempo real.
   */
  init() {
    if (this.unsubscribe) return

    this.unsubscribe = this.store.subscribe((state) => {
      if (state && state.accessibility) {
        this.applyPreferences(state.accessibility)
      }
    })
  }

  /**
   * Traduce las preferencias del store en atributos del DOM sobre <html>.
   * @param {Object} accessibility
   */
  applyPreferences(accessibility) {
    const html = document.documentElement
    if (!html) return

    // 1. Escalado de tamaño de texto
    html.setAttribute('data-text-scale', accessibility.textScale || 'default')

    // 2. Tipografía legible (Arial)
    html.setAttribute('data-accessible-font', accessibility.accessibleFont ? 'true' : 'false')

    // 3. Interlineado
    html.setAttribute('data-line-height', accessibility.lineHeight || 'default')

    // 4. Espaciado horizontal
    html.setAttribute('data-horizontal-spacing', accessibility.horizontalSpacing || 'default')

    // 5. Cursor grande
    html.setAttribute('data-large-cursor', accessibility.largeCursor ? 'true' : 'false')

    // 6. Reducción de movimiento (Triestado: 'system' | 'enabled' | 'disabled')
    const reducedMotion = accessibility.reducedMotion || 'system'
    if (reducedMotion === 'enabled') {
      html.setAttribute('data-reduced-motion', 'true')
    } else if (reducedMotion === 'disabled') {
      html.setAttribute('data-reduced-motion', 'false')
    } else {
      html.setAttribute('data-reduced-motion', 'system')
    }

    // 7. Tema de contraste
    html.setAttribute('data-theme', accessibility.contrast || 'default')

    // 8. Inversión de colores
    html.setAttribute('data-invert-colors', accessibility.invertColors ? 'true' : 'false')

    // 9. Escala de grises
    html.setAttribute('data-grayscale', accessibility.grayscale ? 'true' : 'false')

    // 10. Nivel de saturación
    html.setAttribute('data-saturation', accessibility.saturation || 'default')

    // 11. Filtro de daltonismo
    html.setAttribute('data-daltonism', accessibility.daltonism || 'none')
  }

  /**
   * Limpia la suscripción al store para evitar fugas de memoria.
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }
}
