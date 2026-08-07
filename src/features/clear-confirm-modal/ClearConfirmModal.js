import { Component } from '../Component.js'

/**
 * Componente que gestiona el modal de confirmación para borrar todos los elementos del lienzo.
 */
export class ClearConfirmModal extends Component {
  constructor(container, onConfirm) {
    super(container)
    this.onConfirm = onConfirm
    this.mount()
  }

  render() {
    this.closeBtn = document.getElementById('clear-confirm-close')
    this.cancelBtn = document.getElementById('clear-confirm-cancel')
    this.submitBtn = document.getElementById('clear-confirm-submit')
  }

  bindEvents() {
    if (this.closeBtn) this.addEvent(this.closeBtn, 'click', () => this.close())
    if (this.cancelBtn) this.addEvent(this.cancelBtn, 'click', () => this.close())

    // Cerrar al hacer clic en el overlay (fuera del diálogo)
    this.addEvent(this.container, 'click', (e) => {
      if (e.target === this.container) this.close()
    })

    // Cerrar con Escape
    this.addEvent(document, 'keydown', (e) => {
      if (!this.container.classList.contains('hidden') && e.key === 'Escape') {
        this.close()
      }
    })

    if (this.submitBtn) {
      this.addEvent(this.submitBtn, 'click', () => {
        if (typeof this.onConfirm === 'function') {
          this.onConfirm()
        }
        this.close()
      })
    }
  }

  open() {
    this.container.classList.remove('hidden')
    this.container.setAttribute('aria-hidden', 'false')
    if (window.lucide) {
      window.lucide.createIcons()
    }
  }

  close() {
    this.container.classList.add('hidden')
    this.container.setAttribute('aria-hidden', 'true')
  }
}
