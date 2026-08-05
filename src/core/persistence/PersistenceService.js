/**
 * Servicio encargado del almacenamiento y recuperación del estado del lienzo.
 * Incorpora un mecanismo de "debounce" para optimizar las escrituras a LocalStorage.
 */
export class PersistenceService {
  /**
   * @param {Storage} [storage] - Motor de almacenamiento (por defecto window.localStorage)
   */
  constructor(storage = window.localStorage) {
    this.storage = storage
    this.timeouts = new Map()
  }

  /**
   * Guarda un valor síncronamente en el almacenamiento.
   * @param {string} key
   * @param {string} value
   */
  save(key, value) {
    try {
      this.storage.setItem(key, value)
    } catch (e) {
      console.error(`PersistenceService: Error guardando datos para "${key}":`, e)
    }
  }

  /**
   * Recupera un valor del almacenamiento.
   * @param {string} key
   * @returns {string|null}
   */
  load(key) {
    try {
      return this.storage.getItem(key)
    } catch (e) {
      console.error(`PersistenceService: Error cargando datos para "${key}":`, e)
      return null
    }
  }

  /**
   * Remueve un valor del almacenamiento.
   * @param {string} key
   */
  remove(key) {
    try {
      this.storage.removeItem(key)
    } catch (e) {
      console.error(`PersistenceService: Error removiendo datos para "${key}":`, e)
    }
  }

  /**
   * Guarda un valor aplicando un debounce para agrupar múltiples llamadas rápidas.
   * @param {string} key
   * @param {string} value
   * @param {number} delay - Lapso de tiempo en milisegundos (por defecto 300ms)
   */
  saveDebounced(key, value, delay = 300) {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key))
    }

    const timeout = setTimeout(() => {
      this.save(key, value)
      this.timeouts.delete(key)
    }, delay)

    this.timeouts.set(key, timeout)
  }
}

export const persistenceService = new PersistenceService()
