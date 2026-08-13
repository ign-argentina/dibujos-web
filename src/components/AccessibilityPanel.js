import { Component } from '../features/Component.js'
import { appStore, DEFAULT_ACCESSIBILITY } from '../state/AppStore.js'

/**
 * Componente que renderiza y controla la interfaz de usuario para las
 * configuraciones de accesibilidad.
 */
export class AccessibilityPanel extends Component {
  constructor(container, props = {}) {
    super(container, props)
    this.unsubscribe = null
  }

  render() {
    this.container.innerHTML = `
      <div class="nbi-accessibility-panel" role="region" aria-label="Controles de Accesibilidad">
        
        <!-- SECCIÓN 1: TIPOGRAFÍA Y LECTURA -->
        <fieldset class="nbi-accessibility-group">
          <legend class="nbi-accessibility-group__title">
            <i data-lucide="type"></i> Lectura y Texto
          </legend>

          <!-- Tamaño del texto -->
          <div class="nbi-control-row">
            <span class="nbi-control-label" id="lbl-text-scale">Tamaño de letra</span>
            <div class="nbi-segmented-control" role="radiogroup" aria-labelledby="lbl-text-scale">
              <label class="nbi-segmented-control__option" title="Letra Chica">
                <input type="radio" name="textScale" value="default" />
                <span>Chica</span>
              </label>
              <label class="nbi-segmented-control__option" title="Letra Grande">
                <input type="radio" name="textScale" value="large" />
                <span>Grande</span>
              </label>
              <label class="nbi-segmented-control__option" title="Letra Muy Grande">
                <input type="radio" name="textScale" value="xlarge" />
                <span>M. Gr.</span>
              </label>
            </div>
          </div>

          <!-- Fuente legible (Arial) -->
          <div class="nbi-control-row nbi-control-row--inline">
            <label class="nbi-control-label" for="ctrl-accessible-font">Tipografía Arial legible</label>
            <button type="button" role="switch" aria-checked="false" class="nbi-switch" id="ctrl-accessible-font" aria-label="Tipografía Arial legible">
              <span class="nbi-switch__track">
                <span class="nbi-switch__thumb"></span>
              </span>
            </button>
          </div>

          <!-- Interlineado -->
          <div class="nbi-control-row">
            <span class="nbi-control-label" id="lbl-line-height">Espacio entre renglones</span>
            <div class="nbi-segmented-control" role="radiogroup" aria-labelledby="lbl-line-height">
              <label class="nbi-segmented-control__option" title="Interlineado Normal">
                <input type="radio" name="lineHeight" value="default" />
                <span>Normal</span>
              </label>
              <label class="nbi-segmented-control__option" title="Interlineado Medio">
                <input type="radio" name="lineHeight" value="medium" />
                <span>Medio</span>
              </label>
              <label class="nbi-segmented-control__option" title="Interlineado Doble">
                <input type="radio" name="lineHeight" value="double" />
                <span>Doble</span>
              </label>
            </div>
          </div>

          <!-- Espaciado horizontal -->
          <div class="nbi-control-row">
            <span class="nbi-control-label" id="lbl-horizontal-spacing">Separación de letras</span>
            <div class="nbi-segmented-control" role="radiogroup" aria-labelledby="lbl-horizontal-spacing">
              <label class="nbi-segmented-control__option" title="Separación Normal">
                <input type="radio" name="horizontalSpacing" value="default" />
                <span>Normal</span>
              </label>
              <label class="nbi-segmented-control__option" title="Separación Media">
                <input type="radio" name="horizontalSpacing" value="medium" />
                <span>Media</span>
              </label>
              <label class="nbi-segmented-control__option" title="Separación Amplia">
                <input type="radio" name="horizontalSpacing" value="large" />
                <span>Amplia</span>
              </label>
            </div>
          </div>
        </fieldset>

        <!-- SECCIÓN 2: COLORES Y CONTRASTE -->
        <fieldset class="nbi-accessibility-group">
          <legend class="nbi-accessibility-group__title">
            <i data-lucide="contrast"></i> Colores y Contraste
          </legend>

          <!-- Alto contraste -->
          <div class="nbi-control-row">
            <span class="nbi-control-label" id="lbl-contrast">Temas de alto contraste</span>
            <div class="nbi-segmented-control" role="radiogroup" aria-labelledby="lbl-contrast">
              <label class="nbi-segmented-control__option" title="Tema por Defecto">
                <input type="radio" name="contrast" value="default" />
                <span>Normal</span>
              </label>
              <label class="nbi-segmented-control__option" title="Contraste Oscuro">
                <input type="radio" name="contrast" value="hc-dark" />
                <span>Oscuro</span>
              </label>
              <label class="nbi-segmented-control__option" title="Contraste Claro">
                <input type="radio" name="contrast" value="hc-light" />
                <span>Claro</span>
              </label>
            </div>
          </div>

          <!-- Invertir colores -->
          <div class="nbi-control-row nbi-control-row--inline">
            <label class="nbi-control-label" for="ctrl-invert-colors">Invertir colores del lienzo</label>
            <button type="button" role="switch" aria-checked="false" class="nbi-switch" id="ctrl-invert-colors" aria-label="Invertir colores del lienzo">
              <span class="nbi-switch__track">
                <span class="nbi-switch__thumb"></span>
              </span>
            </button>
          </div>

          <!-- Escala de grises -->
          <div class="nbi-control-row nbi-control-row--inline">
            <label class="nbi-control-label" for="ctrl-grayscale">Ver en escala de grises</label>
            <button type="button" role="switch" aria-checked="false" class="nbi-switch" id="ctrl-grayscale" aria-label="Ver en escala de grises">
              <span class="nbi-switch__track">
                <span class="nbi-switch__thumb"></span>
              </span>
            </button>
          </div>

          <!-- Nivel de saturación -->
          <div class="nbi-control-row">
            <span class="nbi-control-label" id="lbl-saturation">Nivel de saturación</span>
            <div class="nbi-segmented-control" role="radiogroup" aria-labelledby="lbl-saturation">
              <label class="nbi-segmented-control__option" title="Saturación Reducida">
                <input type="radio" name="saturation" value="reduced" />
                <span>Baja</span>
              </label>
              <label class="nbi-segmented-control__option" title="Saturación Normal">
                <input type="radio" name="saturation" value="default" />
                <span>Normal</span>
              </label>
              <label class="nbi-segmented-control__option" title="Saturación Aumentada">
                <input type="radio" name="saturation" value="increased" />
                <span>Alta</span>
              </label>
            </div>
          </div>

          <!-- Filtro de daltonismo -->
          <div class="nbi-control-row">
            <span class="nbi-control-label" id="lbl-daltonism">Filtro para daltonismo</span>
            <div class="nbi-segmented-control" role="radiogroup" aria-labelledby="lbl-daltonism">
              <label class="nbi-segmented-control__option" title="Sin Filtro">
                <input type="radio" name="daltonism" value="none" />
                <span>No</span>
              </label>
              <label class="nbi-segmented-control__option" title="Protanopia (Rojo débil)">
                <input type="radio" name="daltonism" value="protanopia" />
                <span>Protan.</span>
              </label>
              <label class="nbi-segmented-control__option" title="Deuteranopia (Verde débil)">
                <input type="radio" name="daltonism" value="deuteranopia" />
                <span>Deuter.</span>
              </label>
              <label class="nbi-segmented-control__option" title="Tritanopia (Azul débil)">
                <input type="radio" name="daltonism" value="tritanopia" />
                <span>Tritan.</span>
              </label>
            </div>
          </div>
        </fieldset>

        <!-- SECCIÓN 3: INTERACCIÓN Y MOVIMIENTO -->
        <fieldset class="nbi-accessibility-group">
          <legend class="nbi-accessibility-group__title">
            <i data-lucide="mouse-pointer"></i> Interacción y Movimiento
          </legend>

          <!-- Cursor grande -->
          <div class="nbi-control-row nbi-control-row--inline">
            <label class="nbi-control-label" for="ctrl-large-cursor">Cursor grande y visible</label>
            <button type="button" role="switch" aria-checked="false" class="nbi-switch" id="ctrl-large-cursor" aria-label="Cursor grande y visible">
              <span class="nbi-switch__track">
                <span class="nbi-switch__thumb"></span>
              </span>
            </button>
          </div>

          <!-- Reducir movimiento -->
          <div class="nbi-control-row">
            <span class="nbi-control-label" id="lbl-reduced-motion">Reducir movimiento</span>
            <div class="nbi-segmented-control" role="radiogroup" aria-labelledby="lbl-reduced-motion">
              <label class="nbi-segmented-control__option" title="Preferencia de Sistema">
                <input type="radio" name="reducedMotion" value="system" />
                <span>Sistema</span>
              </label>
              <label class="nbi-segmented-control__option" title="Reducción Activada">
                <input type="radio" name="reducedMotion" value="enabled" />
                <span>Sí</span>
              </label>
              <label class="nbi-segmented-control__option" title="Reducción Desactivada">
                <input type="radio" name="reducedMotion" value="disabled" />
                <span>No</span>
              </label>
            </div>
          </div>
        </fieldset>

        <!-- BOTÓN DE RESTABLECER -->
        <button type="button" class="nbi-btn nbi-btn--danger nbi-btn--reset" id="ctrl-reset-accessibility" aria-label="Restablecer todas las opciones de accesibilidad a los valores por defecto">
          <i data-lucide="rotate-ccw"></i> Restablecer valores
        </button>
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
    // 1. Vincular los interruptores booleanos (Switches)
    const switches = [
      { id: 'ctrl-accessible-font', key: 'accessibleFont' },
      { id: 'ctrl-invert-colors', key: 'invertColors' },
      { id: 'ctrl-grayscale', key: 'grayscale' },
      { id: 'ctrl-large-cursor', key: 'largeCursor' }
    ]

    switches.forEach(({ id, key }) => {
      const button = this.container.querySelector(`#${id}`)
      if (button) {
        this.addEvent(button, 'click', () => {
          const currentVal = appStore.getState().accessibility[key]
          appStore.dispatch({
            type: 'SET_ACCESSIBILITY_PREFERENCE',
            payload: { key, value: !currentVal }
          })
        })
      }
    })

    // 2. Vincular los controles segmentados (Radios)
    const radioKeys = [
      'textScale',
      'lineHeight',
      'horizontalSpacing',
      'contrast',
      'saturation',
      'reducedMotion',
      'daltonism'
    ]

    radioKeys.forEach((key) => {
      const radios = this.container.querySelectorAll(`input[name="${key}"]`)
      radios.forEach((radio) => {
        this.addEvent(radio, 'change', (e) => {
          if (e.target.checked) {
            let val = e.target.value
            // Castear booleanos textuales si los hubiera en el futuro
            if (val === 'true') val = true
            if (val === 'false') val = false
            
            appStore.dispatch({
              type: 'SET_ACCESSIBILITY_PREFERENCE',
              payload: { key, value: val }
            })
          }
        })
      })
    })

    // 3. Vincular el botón de reseteo
    const resetBtn = this.container.querySelector('#ctrl-reset-accessibility')
    if (resetBtn) {
      this.addEvent(resetBtn, 'click', () => {
        appStore.dispatch({ type: 'RESET_ACCESSIBILITY' })
      })
    }
  }

  mount() {
    super.mount()
    this.unsubscribe = appStore.subscribe((state) => {
      if (state && state.accessibility) {
        this.updateControls(state.accessibility)
      }
    })
  }

  unmount() {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    super.unmount()
  }

  /**
   * Actualiza el valor visual e indicaciones semánticas ARIA de cada control.
   * @param {Object} accessibility
   */
  updateControls(accessibility) {
    // 1. Sincronizar interruptores (Switches)
    const switches = [
      { id: 'ctrl-accessible-font', key: 'accessibleFont' },
      { id: 'ctrl-invert-colors', key: 'invertColors' },
      { id: 'ctrl-grayscale', key: 'grayscale' },
      { id: 'ctrl-large-cursor', key: 'largeCursor' }
    ]

    switches.forEach(({ id, key }) => {
      const button = this.container.querySelector(`#${id}`)
      if (button) {
        const value = !!accessibility[key]
        button.setAttribute('aria-checked', value ? 'true' : 'false')
        button.classList.toggle('is-active', value)
      }
    })

    // 2. Sincronizar controles segmentados (Radios)
    const radioKeys = [
      'textScale',
      'lineHeight',
      'horizontalSpacing',
      'contrast',
      'saturation',
      'reducedMotion',
      'daltonism'
    ]

    radioKeys.forEach((key) => {
      const val = accessibility[key]
      const radio = this.container.querySelector(`input[name="${key}"][value="${val}"]`)
      if (radio) {
        radio.checked = true
      }
    })

    // 3. Desactivar el botón Reset si todas las opciones corresponden a los valores por defecto
    const resetBtn = this.container.querySelector('#ctrl-reset-accessibility')
    if (resetBtn) {
      const isDefault = JSON.stringify(accessibility) === JSON.stringify(DEFAULT_ACCESSIBILITY)
      resetBtn.disabled = isDefault
    }
  }
}
