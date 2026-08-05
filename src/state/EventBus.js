export class EventBus {
  constructor() {
    this.listeners = new Map()
  }

  /**
   * Suscribirse a un evento.
   * @param {string} event - Nombre del evento.
   * @param {Function} callback - Función a ejecutar.
   * @returns {Function} Función para desuscribirse.
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('El callback de suscripción debe ser una función')
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)

    return () => {
      const list = this.listeners.get(event) || []
      this.listeners.set(
        event,
        list.filter((cb) => cb !== callback)
      )
    }
  }

  /**
   * Publicar un evento.
   * @param {string} event - Nombre del evento.
   * @param {*} data - Datos asociados al evento.
   */
  emit(event, data) {
    const list = this.listeners.get(event) || []
    list.forEach((callback) => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Error en listener del evento "${event}":`, error)
      }
    })
  }
}

export const eventBus = new EventBus()
