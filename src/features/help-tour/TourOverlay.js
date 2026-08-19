import { Component } from '../Component.js'
import { Positioning } from './Positioning.js'
import { appStore } from '../../state/AppStore.js'
import { throttle } from '../../core/utils/throttle.js'

/**
 * Componente visual que renderiza la capa de tour guiado:
 * - Backdrop de pantalla completa para bloqueo de interacciones
 * - Spotlight con marco Neo-Brutalista recortado mediante máscara SVG
 * - Tooltip flotante con indicador de paso, contenido y botones accesibles
 * - Gestión completa de foco (Focus Trap), teclado y reducción de movimiento
 */
export class TourOverlay extends Component {
  /**
   * @param {HTMLElement} container - Contenedor padre donde se inyectará el overlay (ej. document.body)
   * @param {Object} props
   * @param {Object} props.step - Definición del paso ({ id, target, title, text, placement })
   * @param {HTMLElement} [props.targetElement] - Elemento DOM objetivo
   * @param {Object} [props.targetRect] - Bounding rect opcional del target
   * @param {number} [props.stepIndex=0] - Índice del paso actual (0-indexed)
   * @param {number} [props.totalSteps=1] - Cantidad total de pasos
   * @param {Function} [props.onNext] - Callback para avanzar de paso
   * @param {Function} [props.onPrev] - Callback para retroceder de paso
   * @param {Function} [props.onClose] - Callback para cerrar/finalizar el recorrido
   * @param {Object} [props.appStore] - Instancia de AppStore para preferencias de accesibilidad
   */
  constructor(container = document.body, props = {}) {
    super(container, props)

    this.step = props.step || { id: '', title: '', text: '', placement: 'bottom' }
    this.targetElement = props.targetElement || null
    this.targetRect = props.targetRect || null
    this.stepIndex = typeof props.stepIndex === 'number' ? props.stepIndex : 0
    this.totalSteps = typeof props.totalSteps === 'number' ? props.totalSteps : 1
    this.store = props.appStore || appStore

    this.onNext = props.onNext || null
    this.onPrev = props.onPrev || null
    this.onClose = props.onClose || null

    this.padding = 6 // Holgura en px alrededor del target
    this.throttledResize = throttle(() => this.positionTooltip(), 100)
  }

  /**
   * Comprueba si el usuario tiene activada la reducción de movimiento.
   * @returns {boolean}
   */
  isReducedMotion() {
    const storeState = this.store && typeof this.store.getState === 'function' ? this.store.getState() : null
    const setting = storeState?.accessibility?.reducedMotion

    if (setting === 'enabled') return true
    if (setting === 'disabled') return false

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }

    return false
  }

  render() {
    const isLastStep = this.stepIndex >= this.totalSteps - 1
    const prevDisabled = this.stepIndex <= 0 ? 'disabled' : ''

    const overlayDiv = document.createElement('div')
    overlayDiv.className = 'nbi-tour-overlay'
    overlayDiv.id = 'tour-overlay-root'

    overlayDiv.innerHTML = `
      <!-- Máscara SVG del spotlight -->
      <svg class="nbi-tour-mask" width="100%" height="100%" aria-hidden="true">
        <defs>
          <mask id="nbi-tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect id="tour-mask-cutout" x="0" y="0" width="0" height="0" rx="12" fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.55)" mask="url(#nbi-tour-spotlight-mask)" />
      </svg>

      <!-- Marco exterior Neo-Brutalista -->
      <div class="nbi-tour-spotlight-frame" id="tour-spotlight-frame" style="left: 0px; top: 0px; width: 0px; height: 0px;"></div>

      <!-- Ventana de diálogo accesible del tooltip -->
      <div class="nbi-tour-tooltip nbi-window-floating" id="tour-tooltip" role="dialog" aria-modal="true" aria-labelledby="tour-step-title" aria-describedby="tour-step-desc" tabindex="-1">
        <div class="nbi-tour-header">
          <span class="nbi-tour-badge" id="tour-step-badge">Paso ${this.stepIndex + 1} de ${this.totalSteps}</span>
          <button type="button" class="nbi-btn nbi-btn--close-popover nbi-tour-btn-close" id="tour-btn-close" title="Cerrar recorrido (Escape)" aria-label="Cerrar recorrido">
            <i data-lucide="x"></i>
          </button>
        </div>
        <h2 class="nbi-tour-title" id="tour-step-title">${this.escapeHTML(this.step.title)}</h2>
        <p class="nbi-tour-desc" id="tour-step-desc">${this.escapeHTML(this.step.text)}</p>
        <div class="nbi-tour-footer">
          <button type="button" class="nbi-btn nbi-btn--sm" id="tour-btn-prev" ${prevDisabled} aria-label="Paso anterior">
            <i data-lucide="chevron-left"></i>
            <span>Anterior</span>
          </button>
          <button type="button" class="nbi-btn nbi-btn--sm ${isLastStep ? 'nbi-btn--success' : 'nbi-btn--secondary'}" id="tour-btn-next" aria-label="${isLastStep ? 'Finalizar recorrido' : 'Siguiente paso'}">
            <span>${isLastStep ? 'Finalizar' : 'Siguiente'}</span>
            <i data-lucide="${isLastStep ? 'check' : 'chevron-right'}"></i>
          </button>
        </div>
        <div class="nbi-tour-arrow" id="tour-arrow" data-placement="bottom" style="left: 0px; top: 0px;"></div>
      </div>

      <!-- Live announcer para lectores de pantalla -->
      <div class="sr-only" aria-live="polite" aria-atomic="true" id="tour-live-announcer">
        Paso ${this.stepIndex + 1} de ${this.totalSteps}: ${this.step.title}. ${this.step.text}
      </div>
    `

    this.container.appendChild(overlayDiv)
    this.element = overlayDiv

    this.tooltipEl = overlayDiv.querySelector('#tour-tooltip')
    this.cutoutEl = overlayDiv.querySelector('#tour-mask-cutout')
    this.frameEl = overlayDiv.querySelector('#tour-spotlight-frame')
    this.arrowEl = overlayDiv.querySelector('#tour-arrow')
    this.badgeEl = overlayDiv.querySelector('#tour-step-badge')
    this.titleEl = overlayDiv.querySelector('#tour-step-title')
    this.descEl = overlayDiv.querySelector('#tour-step-desc')
    this.prevBtn = overlayDiv.querySelector('#tour-btn-prev')
    this.nextBtn = overlayDiv.querySelector('#tour-btn-next')
    this.closeBtn = overlayDiv.querySelector('#tour-btn-close')
    this.announcerEl = overlayDiv.querySelector('#tour-live-announcer')

    if (window.lucide) {
      window.lucide.createIcons({
        attrs: {
          class: 'nbi-btn__icon'
        }
      })
    }

    this.positionTooltip()
  }

  /**
   * Calcula y aplica las coordenadas del spotlight, marco y tooltip.
   */
  positionTooltip() {
    if (!this.tooltipEl) return

    let rawRect = this.targetRect
    if (!rawRect && this.targetElement && typeof this.targetElement.getBoundingClientRect === 'function') {
      rawRect = this.targetElement.getBoundingClientRect()
    }

    const viewport = {
      width: typeof window !== 'undefined' ? window.innerWidth : 1024,
      height: typeof window !== 'undefined' ? window.innerHeight : 768
    }

    if (!rawRect || (rawRect.width === 0 && rawRect.height === 0)) {
      // Si el elemento no tiene rectángulo válido, centrar el tooltip en pantalla
      const tooltipW = this.tooltipEl.offsetWidth || 340
      const tooltipH = this.tooltipEl.offsetHeight || 180
      const cx = Math.max(12, Math.round((viewport.width - tooltipW) / 2))
      const cy = Math.max(12, Math.round((viewport.height - tooltipH) / 2))

      this.tooltipEl.style.left = `${cx}px`
      this.tooltipEl.style.top = `${cy}px`
      if (this.cutoutEl) {
        this.cutoutEl.setAttribute('x', '0')
        this.cutoutEl.setAttribute('y', '0')
        this.cutoutEl.setAttribute('width', '0')
        this.cutoutEl.setAttribute('height', '0')
      }
      if (this.frameEl) {
        this.frameEl.style.display = 'none'
      }
      if (this.arrowEl) {
        this.arrowEl.style.display = 'none'
      }
      return
    }

    // Calcular rectángulo con padding
    const paddedRect = {
      left: Math.max(0, rawRect.left - this.padding),
      top: Math.max(0, rawRect.top - this.padding),
      width: rawRect.width + this.padding * 2,
      height: rawRect.height + this.padding * 2,
      right: rawRect.right + this.padding,
      bottom: rawRect.bottom + this.padding
    }

    // Actualizar máscara SVG y marco visual del spotlight
    if (this.cutoutEl) {
      this.cutoutEl.setAttribute('x', String(paddedRect.left))
      this.cutoutEl.setAttribute('y', String(paddedRect.top))
      this.cutoutEl.setAttribute('width', String(paddedRect.width))
      this.cutoutEl.setAttribute('height', String(paddedRect.height))
    }

    if (this.frameEl) {
      this.frameEl.style.display = 'block'
      this.frameEl.style.left = `${paddedRect.left}px`
      this.frameEl.style.top = `${paddedRect.top}px`
      this.frameEl.style.width = `${paddedRect.width}px`
      this.frameEl.style.height = `${paddedRect.height}px`
    }

    // Medir tooltip y calcular posición óptima
    const tooltipSize = {
      width: this.tooltipEl.offsetWidth || 340,
      height: this.tooltipEl.offsetHeight || 180
    }

    const pos = Positioning.calculatePosition({
      targetRect: paddedRect,
      tooltipSize,
      viewport,
      placement: this.step.placement || 'bottom',
      gap: 12,
      margin: 12
    })

    this.tooltipEl.style.left = `${pos.x}px`
    this.tooltipEl.style.top = `${pos.y}px`

    if (this.arrowEl) {
      this.arrowEl.style.display = 'block'
      this.arrowEl.setAttribute('data-placement', pos.arrow.placement)
      this.arrowEl.style.left = `${pos.arrow.x}px`
      this.arrowEl.style.top = `${pos.arrow.y}px`
    }
  }

  /**
   * Desplaza el elemento objetivo hacia el viewport si se encuentra fuera de la vista.
   */
  scrollTargetIntoView() {
    if (!this.targetElement || typeof this.targetElement.getBoundingClientRect !== 'function') return

    const rect = this.targetElement.getBoundingClientRect()
    const isOutside =
      rect.top < 0 ||
      rect.bottom > (typeof window !== 'undefined' ? window.innerHeight : 768) ||
      rect.left < 0 ||
      rect.right > (typeof window !== 'undefined' ? window.innerWidth : 1024)

    if (isOutside && typeof this.targetElement.scrollIntoView === 'function') {
      this.targetElement.scrollIntoView({
        behavior: this.isReducedMotion() ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'nearest'
      })
    }
  }

  bindEvents() {
    // 1. Botones de interacción
    if (this.nextBtn) {
      this.addEvent(this.nextBtn, 'click', () => {
        if (typeof this.onNext === 'function') this.onNext()
      })
    }

    if (this.prevBtn) {
      this.addEvent(this.prevBtn, 'click', () => {
        if (this.stepIndex > 0 && typeof this.onPrev === 'function') this.onPrev()
      })
    }

    if (this.closeBtn) {
      this.addEvent(this.closeBtn, 'click', () => {
        if (typeof this.onClose === 'function') this.onClose()
      })
    }

    // 2. Control de atajos de teclado y Focus Trap
    this.addEvent(document, 'keydown', (e) => {
      if (!this.element) return

      if (e.key === 'Escape') {
        e.preventDefault()
        if (typeof this.onClose === 'function') this.onClose()
        return
      }

      if (e.key === 'ArrowRight') {
        // Solo avanzar con flecha derecha si no estamos en un botón que requiera interacción local distinta
        const active = document.activeElement
        if (active !== this.closeBtn && active !== this.prevBtn) {
          e.preventDefault()
          if (typeof this.onNext === 'function') this.onNext()
        }
        return
      }

      if (e.key === 'ArrowLeft') {
        if (this.stepIndex > 0) {
          const active = document.activeElement
          if (active !== this.closeBtn && active !== this.nextBtn) {
            e.preventDefault()
            if (typeof this.onPrev === 'function') this.onPrev()
          }
        }
        return
      }

      if (e.key === 'Tab') {
        this.handleFocusTrap(e)
      }
    })

    // 3. Listener de redimensionamiento de ventana
    if (typeof window !== 'undefined') {
      this.addEvent(window, 'resize', this.throttledResize, { passive: true })
    }
  }

  /**
   * Mantiene el ciclo de foco estrictamente contenido dentro del tooltip (Focus Trap).
   * @param {KeyboardEvent} e
   */
  handleFocusTrap(e) {
    if (!this.tooltipEl) return

    const focusable = Array.from(
      this.tooltipEl.querySelectorAll('button:not([disabled]), [tabindex="0"]')
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
   * Actualiza el overlay con los datos de un nuevo paso sin destruir todo el DOM.
   * @param {Object} props
   */
  update(props = {}) {
    if (props.step) this.step = props.step
    if (props.targetElement !== undefined) this.targetElement = props.targetElement
    if (props.targetRect !== undefined) this.targetRect = props.targetRect
    if (typeof props.stepIndex === 'number') this.stepIndex = props.stepIndex
    if (typeof props.totalSteps === 'number') this.totalSteps = props.totalSteps
    if (props.onNext) this.onNext = props.onNext
    if (props.onPrev) this.onPrev = props.onPrev
    if (props.onClose) this.onClose = props.onClose

    const isLastStep = this.stepIndex >= this.totalSteps - 1
    const prevDisabled = this.stepIndex <= 0

    if (this.badgeEl) {
      this.badgeEl.textContent = `Paso ${this.stepIndex + 1} de ${this.totalSteps}`
    }

    if (this.titleEl) {
      this.titleEl.textContent = this.step.title || ''
    }

    if (this.descEl) {
      this.descEl.textContent = this.step.text || ''
    }

    if (this.prevBtn) {
      this.prevBtn.disabled = prevDisabled
    }

    if (this.nextBtn) {
      this.nextBtn.className = `nbi-btn nbi-btn--sm ${isLastStep ? 'nbi-btn--success' : 'nbi-btn--secondary'}`
      this.nextBtn.setAttribute('aria-label', isLastStep ? 'Finalizar recorrido' : 'Siguiente paso')
      this.nextBtn.innerHTML = `
        <span>${isLastStep ? 'Finalizar' : 'Siguiente'}</span>
        <i data-lucide="${isLastStep ? 'check' : 'chevron-right'}"></i>
      `
    }

    if (this.announcerEl) {
      this.announcerEl.textContent = `Paso ${this.stepIndex + 1} de ${this.totalSteps}: ${this.step.title}. ${this.step.text}`
    }

    if (window.lucide) {
      window.lucide.createIcons({
        attrs: {
          class: 'nbi-btn__icon'
        }
      })
    }

    this.scrollTargetIntoView()
    this.positionTooltip()

    // Enfocar el botón de avanzar por defecto
    if (this.nextBtn) {
      this.nextBtn.focus()
    }
  }

  mount() {
    super.mount()
    this.scrollTargetIntoView()

    // Inicializar foco en el botón siguiente
    setTimeout(() => {
      if (this.nextBtn) {
        this.nextBtn.focus()
      }
    }, 0)
  }

  unmount() {
    super.unmount()
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
    this.element = null
  }

  escapeHTML(str) {
    if (!str) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}
