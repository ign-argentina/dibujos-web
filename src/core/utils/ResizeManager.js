import { throttle } from './throttle.js'

/**
 * Gestor de eventos de redimensionamiento centralizado con control de frecuencia.
 * Soporta ResizeObserver moderno y fallback para navegadores antiguos.
 */
export class ResizeManager {
  constructor(callback, delay = 100) {
    this.callback = throttle(callback, delay)
    this.observer = null
    this.fallbackListener = null
  }

  /**
   * Empieza a monitorear el tamaño de un elemento HTML.
   * @param {HTMLElement} element
   */
  observe(element) {
    if ('ResizeObserver' in window) {
      this.observer = new ResizeObserver((entries) => {
        this.callback(entries)
      })
      this.observer.observe(element)
    } else {
      this.fallbackListener = () => this.callback()
      window.addEventListener('resize', this.fallbackListener)
    }
  }

  /**
   * Detiene el monitoreo sobre un elemento HTML específico.
   * @param {HTMLElement} element
   */
  unobserve(element) {
    if (this.observer) {
      this.observer.unobserve(element)
    } else if (this.fallbackListener) {
      window.removeEventListener('resize', this.fallbackListener)
    }
  }

  /**
   * Detiene todo el monitoreo y limpia listeners.
   */
  disconnect() {
    if (this.observer) {
      this.observer.disconnect()
    } else if (this.fallbackListener) {
      window.removeEventListener('resize', this.fallbackListener)
    }
  }
}
