import { Component } from '../Component.js'

/**
 * Cuadro de diálogo modal accesible para la invitación inicial al recorrido guiado.
 * Permite al usuario iniciar el tour, posponerlo ("Ahora no") o desactivar avisos futuros ("No volver a mostrar").
 */
export class TourWelcomeModal extends Component {
  /**
   * @param {HTMLElement} [container=document.body] - Contenedor padre donde se inserta el modal
   * @param {Object} [props]
   * @param {Function} [props.onStart] - Callback al presionar "Iniciar recorrido" ({ dontShowAgain: boolean })
   * @param {Function} [props.onDismiss] - Callback al cerrar u omitir el modal ({ dontShowAgain: boolean })
   */
  constructor(container = document.body, props = {}) {
    super(container, props)

    this.onStart = props.onStart || null
    this.onDismiss = props.onDismiss || null
    this.triggerElement = null
  }

  render() {
    const modalOverlay = document.createElement('div')
    modalOverlay.id = 'tour-welcome-modal'
    modalOverlay.className = 'nbi-export-modal-overlay hidden'
    modalOverlay.setAttribute('role', 'dialog')
    modalOverlay.setAttribute('aria-modal', 'true')
    modalOverlay.setAttribute('aria-labelledby', 'tour-welcome-title')
    modalOverlay.setAttribute('aria-describedby', 'tour-welcome-desc')

    modalOverlay.innerHTML = `
      <div class="nbi-window-floating nbi-tour-welcome-dialog">
        <div class="nbi-tour-welcome-header">
          <div class="nbi-tour-welcome-title-group">
            <i data-lucide="circle-question-mark" class="nbi-tour-welcome-icon" aria-hidden="true"></i>
            <h2 id="tour-welcome-title" class="nbi-tour-welcome-title">¿Querés conocer las herramientas?</h2>
          </div>
          <button type="button" class="nbi-btn nbi-btn--close-popover" id="tour-welcome-close" title="Cerrar (Escape)" aria-label="Cerrar ventana de bienvenida">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="nbi-tour-welcome-body">
          <p id="tour-welcome-desc" class="nbi-tour-welcome-desc">
            Te invitamos a realizar un breve recorrido guiado para descubrir cómo explorar mapas oficiales de Argentina y utilizar las herramientas de dibujo y anotación.
          </p>
          <p class="nbi-tour-welcome-note">
            Este recorrido es opcional. Siempre podrás iniciarlo o repetirlo desde la solapa <strong>Ayuda</strong> en el panel lateral.
          </p>
          <label class="nbi-tour-welcome-checkbox-label" for="tour-welcome-dont-show">
            <input type="checkbox" id="tour-welcome-dont-show" />
            <span>No volver a mostrar este mensaje al iniciar</span>
          </label>
        </div>
        <div class="nbi-tour-welcome-footer">
          <button type="button" class="nbi-btn" id="tour-welcome-dismiss" aria-label="Omitir recorrido por ahora">
            <span>Ahora no</span>
          </button>
          <button type="button" class="nbi-btn nbi-btn--success" id="tour-welcome-start" aria-label="Comenzar el recorrido guiado">
            <i data-lucide="circle-question-mark"></i>
            <span>Iniciar recorrido</span>
          </button>
        </div>
      </div>
    `

    this.container.appendChild(modalOverlay)
    this.element = modalOverlay

    this.closeBtn = modalOverlay.querySelector('#tour-welcome-close')
    this.checkbox = modalOverlay.querySelector('#tour-welcome-dont-show')
    this.dismissBtn = modalOverlay.querySelector('#tour-welcome-dismiss')
    this.startBtn = modalOverlay.querySelector('#tour-welcome-start')

    if (window.lucide) {
      window.lucide.createIcons({
        attrs: {
          class: 'nbi-btn__icon'
        }
      })
    }
  }

  bindEvents() {
    if (this.closeBtn) {
      this.addEvent(this.closeBtn, 'click', () => this._handleDismiss())
    }

    if (this.dismissBtn) {
      this.addEvent(this.dismissBtn, 'click', () => this._handleDismiss())
    }

    if (this.startBtn) {
      this.addEvent(this.startBtn, 'click', () => this._handleStart())
    }

    // Cierre al hacer clic fuera del diálogo
    this.addEvent(this.element, 'click', (e) => {
      if (e.target === this.element) {
        this._handleDismiss()
      }
    })

    // Atajos de teclado y Focus Trap
    this.addEvent(document, 'keydown', (e) => {
      if (!this.isOpen()) return

      if (e.key === 'Escape') {
        e.preventDefault()
        this._handleDismiss()
        return
      }

      if (e.key === 'Tab') {
        this._handleFocusTrap(e)
      }
    })
  }

  _handleStart() {
    const dontShowAgain = Boolean(this.checkbox && this.checkbox.checked)
    this.close()
    if (typeof this.onStart === 'function') {
      this.onStart({ dontShowAgain })
    }
  }

  _handleDismiss() {
    const dontShowAgain = Boolean(this.checkbox && this.checkbox.checked)
    this.close()
    if (typeof this.onDismiss === 'function') {
      this.onDismiss({ dontShowAgain })
    }
  }

  _handleFocusTrap(e) {
    if (!this.element) return

    const focusable = Array.from(
      this.element.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex="0"]')
    )

    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first || !focusable.includes(document.activeElement)) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last || !focusable.includes(document.activeElement)) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  /**
   * Abre el modal y transfiere el foco al botón de inicio.
   * @param {HTMLElement} [triggerEl]
   */
  open(triggerEl = null) {
    this.triggerElement =
      triggerEl || (typeof document !== 'undefined' ? document.activeElement : null)

    if (this.element) {
      this.element.classList.remove('hidden')
      this.element.setAttribute('aria-hidden', 'false')
    }

    if (this.checkbox) {
      this.checkbox.checked = false
    }

    if (window.lucide) {
      window.lucide.createIcons({
        attrs: {
          class: 'nbi-btn__icon'
        }
      })
    }

    // Enfocar el botón de inicio
    setTimeout(() => {
      if (this.startBtn) {
        this.startBtn.focus()
      }
    }, 0)
  }

  /**
   * Cierra el modal y restituye el foco.
   */
  close() {
    if (this.element) {
      this.element.classList.add('hidden')
      this.element.setAttribute('aria-hidden', 'true')
    }

    if (this.triggerElement && typeof this.triggerElement.focus === 'function') {
      try {
        this.triggerElement.focus()
      } catch {}
    }
  }

  /**
   * Comprueba si el modal está visible.
   * @returns {boolean}
   */
  isOpen() {
    return Boolean(this.element && !this.element.classList.contains('hidden'))
  }

  unmount() {
    super.unmount()
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
    this.element = null
  }
}
