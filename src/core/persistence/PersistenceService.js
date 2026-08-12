/**
 * Determina de forma robusta si un error es debido a haber excedido la cuota de almacenamiento.
 * @param {Error|DOMException} err
 * @returns {boolean}
 */
export function isQuotaExceededError(err) {
  return !!(
    err &&
    (err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014)
  )
}

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
    this.listeners = {
      error: [],
      success: [],
    }
  }

  /**
   * Registra un listener de eventos.
   * @param {string} event - 'success' o 'error'
   * @param {Function} listener
   */
  on(event, listener) {
    if (this.listeners[event]) {
      this.listeners[event].push(listener)
    }
  }

  /**
   * Remueve un listener de eventos.
   * @param {string} event - 'success' o 'error'
   * @param {Function} listener
   */
  off(event, listener) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((l) => l !== listener)
    }
  }

  /**
   * Notifica a los listeners de un evento.
   * @param {string} event - 'success' o 'error'
   * @param {...any} args
   */
  notify(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((listener) => {
        try {
          listener(...args)
        } catch (e) {
          console.error(`PersistenceService: Error en el listener de "${event}":`, e)
        }
      })
    }
  }

  /**
   * Guarda un valor síncronamente en el almacenamiento.
   * @param {string} key
   * @param {string} value
   */
  save(key, value) {
    try {
      this.storage.setItem(key, value)
      this.notify('success', key)
    } catch (e) {
      console.error(`PersistenceService: Error guardando datos para "${key}":`, e)
      this.notify('error', e, key, value)
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
      this.notify('success', key)
    } catch (e) {
      console.error(`PersistenceService: Error removiendo datos para "${key}":`, e)
      this.notify('error', e, key, null)
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
