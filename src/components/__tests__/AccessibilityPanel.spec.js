import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AccessibilityPanel } from '../AccessibilityPanel.js'
import { appStore } from '../../state/AppStore.js'

describe('AccessibilityPanel', () => {
  let container

  beforeEach(() => {
    localStorage.clear()
    appStore.dispatch({ type: 'RESET_ACCESSIBILITY' })
    container = document.createElement('div')
    container.id = 'view-accessibility'
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('debería renderizar la estructura de controles e iconos', () => {
    const panel = new AccessibilityPanel(container)
    panel.mount()

    expect(container.querySelector('.nbi-accessibility-panel')).not.toBeNull()
    expect(container.querySelector('#ctrl-accessible-font')).not.toBeNull()
    expect(container.querySelector('input[name="textScale"]')).not.toBeNull()
    expect(container.querySelector('#ctrl-reset-accessibility')).not.toBeNull()

    panel.destroy()
  })

  it('debería sincronizar los valores iniciales del store en los controles correspondientes', () => {
    const panel = new AccessibilityPanel(container)
    panel.mount()

    // Radio de tamaño por defecto seleccionado
    const defaultRadio = container.querySelector('input[name="textScale"][value="default"]')
    expect(defaultRadio.checked).toBe(true)

    // Switch de fuente desactivado por defecto
    const fontSwitch = container.querySelector('#ctrl-accessible-font')
    expect(fontSwitch.getAttribute('aria-checked')).toBe('false')

    // Botón de reset deshabilitado al estar en valores por defecto
    const resetBtn = container.querySelector('#ctrl-reset-accessibility')
    expect(resetBtn.disabled).toBe(true)

    panel.destroy()
  })

  it('debería disparar SET_ACCESSIBILITY_PREFERENCE al hacer clic en un switch', () => {
    const panel = new AccessibilityPanel(container)
    panel.mount()

    const dispatchSpy = vi.spyOn(appStore, 'dispatch')

    const fontSwitch = container.querySelector('#ctrl-accessible-font')
    fontSwitch.click()

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'accessibleFont', value: true }
    })

    panel.destroy()
  })

  it('debería disparar SET_ACCESSIBILITY_PREFERENCE al cambiar una opción de radio segmentado', () => {
    const panel = new AccessibilityPanel(container)
    panel.mount()

    const dispatchSpy = vi.spyOn(appStore, 'dispatch')

    const largeTextRadio = container.querySelector('input[name="textScale"][value="large"]')
    largeTextRadio.checked = true
    largeTextRadio.dispatchEvent(new Event('change'))

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'textScale', value: 'large' }
    })

    panel.destroy()
  })

  it('debería habilitar el botón Reset cuando hay preferencias modificadas y disparar RESET_ACCESSIBILITY al presionarse', () => {
    const panel = new AccessibilityPanel(container)
    panel.mount()

    const resetBtn = container.querySelector('#ctrl-reset-accessibility')
    expect(resetBtn.disabled).toBe(true)

    // Modificar un estado para habilitarlo
    appStore.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'largeCursor', value: true }
    })

    expect(resetBtn.disabled).toBe(false)

    // Clic en reset
    const dispatchSpy = vi.spyOn(appStore, 'dispatch')
    resetBtn.click()

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'RESET_ACCESSIBILITY'
    })

    panel.destroy()
  })

  it('debería desvincular la suscripción del store al destruirse el componente', () => {
    const panel = new AccessibilityPanel(container)
    panel.mount()

    const fontSwitch = container.querySelector('#ctrl-accessible-font')
    expect(fontSwitch.getAttribute('aria-checked')).toBe('false')

    panel.destroy()

    // Modificar preferencia con el panel destruido
    appStore.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'accessibleFont', value: true }
    })

    // El DOM no debe alterarse
    expect(fontSwitch.getAttribute('aria-checked')).toBe('false')
  })

  it('debería disparar SET_ACCESSIBILITY_PREFERENCE al cambiar la solapa de daltonismo', () => {
    const panel = new AccessibilityPanel(container)
    panel.mount()

    const dispatchSpy = vi.spyOn(appStore, 'dispatch')

    const protanopiaRadio = container.querySelector('input[name="daltonism"][value="protanopia"]')
    protanopiaRadio.checked = true
    protanopiaRadio.dispatchEvent(new Event('change'))

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'daltonism', value: 'protanopia' }
    })

    panel.destroy()
  })
})
