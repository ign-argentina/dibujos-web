import { Component } from '../features/Component.js'

/**
 * Componente que renderiza y gestiona la vista de Ayuda en el Sidebar.
 * Ofrece información introductoria y el acceso al recorrido guiado interactivo.
 */
export class HelpPanel extends Component {
  /**
   * @param {HTMLElement} container - Contenedor DOM para la vista de ayuda (#view-help)
   * @param {Object} [props] - Propiedades configurables
   * @param {Function} [props.onStartTour] - Callback disparado al hacer clic en "Iniciar recorrido"
   */
  constructor(container, props = {}) {
    super(container, props)
    this.onStartTour = props.onStartTour || null
  }

  render() {
    this.container.innerHTML = `
      <div class="nbi-help-panel" role="region" aria-label="Controles de Ayuda y Tutoriales">
        <div class="nbi-help-card">
          <div class="nbi-help-card__header">
            <i data-lucide="circle-question-mark" class="nbi-help-card__icon" aria-hidden="true"></i>
            <h3 class="nbi-help-card__title">Recorrido guiado</h3>
          </div>
          <p class="nbi-help-card__description">
            Conocé las principales herramientas y funciones para crear tus mapas a través de un recorrido breve e interactivo por la pantalla.
          </p>
          <p class="nbi-help-card__note">
            Podés volver a iniciar el recorrido desde esta sección siempre que lo necesites.
          </p>
          <button type="button" class="nbi-btn nbi-btn--secondary nbi-help-panel__start-btn" id="btn-start-tour" aria-label="Iniciar recorrido guiado por la aplicación">
          <i data-lucide="play"></i>
          <span>Iniciar recorrido</span>
          </button>
        </div>
      </div>
    `

    if (window.lucide) {
      window.lucide.createIcons({
        attrs: {
          class: 'nbi-btn__icon'
        }
      })
    }
  }

  bindEvents() {
    const startBtn = this.container.querySelector('#btn-start-tour')
    if (startBtn) {
      this.addEvent(startBtn, 'click', (e) => {
        if (typeof this.onStartTour === 'function') {
          this.onStartTour(e)
        }
      })
    }
  }

  unmount() {
    super.unmount()
    if (this.container) {
      this.container.innerHTML = ''
    }
  }
}
