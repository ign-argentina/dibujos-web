/**
 * Clase base abstracta para componentes visuales de interfaz de usuario.
 * Proporciona ganchos del ciclo de vida y un gestor de eventos seguro para prevenir fugas de memoria.
 */
export class Component {
  /**
   * @param {HTMLElement} container - Elemento del DOM donde se inyectará el componente.
   * @param {Object} [props] - Propiedades y estado inicial configurable.
   */
  constructor(container, props = {}) {
    if (!(container instanceof HTMLElement)) {
      throw new TypeError('El contenedor para Component debe ser un HTMLElement válido')
    }
    this.container = container
    this.props = props
    this.element = null
    this.events = []
  }

  /**
   * Ciclo de vida: Dibuja el elemento HTML en memoria y lo inserta en el DOM.
   */
  mount() {
    this.render()
    this.bindEvents()
  }

  /**
   * Ciclo de vida: Remueve el elemento del DOM y desvincula los event listeners registrados.
   */
  unmount() {
    this.unbindEvents()
    if (this.element && this.element.parentNode === this.container) {
      this.container.removeChild(this.element)
    }
    this.element = null
  }

  /**
   * Método abstracto: Define e inicializa la estructura de elementos HTML y la asigna a this.element.
   * Debe ser implementado por las subclases.
   */
  render() {
    // Implementar en subclase
  }

  /**
   * Método abstracto: Enlaza eventos del DOM utilizando this.addEvent para un desvinculado seguro.
   * Debe ser implementado por las subclases.
   */
  bindEvents() {
    // Implementar en subclase
  }

  /**
   * Registra un manejador de eventos del DOM vinculando su contexto y guardándolo para remoción en unmount().
   * @param {EventTarget} target - Elemento objetivo del evento (ej. un botón o window).
   * @param {string} type - Tipo de evento (ej. 'click', 'change').
   * @param {Function} listener - Callback a ejecutar.
   * @param {Object|boolean} [options] - Opciones adicionales del addEventListener.
   */
  addEvent(target, type, listener, options = false) {
    if (!target) return
    const boundListener = listener.bind(this)
    target.addEventListener(type, boundListener, options)
    this.events.push({ target, type, listener: boundListener, options })
  }

  /**
   * Remueve todos los listeners de eventos que fueron registrados mediante addEvent().
   */
  unbindEvents() {
    this.events.forEach(({ target, type, listener, options }) => {
      if (target) {
        target.removeEventListener(type, listener, options)
      }
    })
    this.events = []
  }

  /**
   * Destruye el componente desmontándolo e invalidando eventos.
   */
  destroy() {
    this.unmount()
  }
}
