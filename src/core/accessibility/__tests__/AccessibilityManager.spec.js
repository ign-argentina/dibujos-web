import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AccessibilityManager } from '../AccessibilityManager.js'
import { AppStore } from '../../../state/AppStore.js'

describe('AccessibilityManager', () => {
  let store
  let manager
  let html

  beforeEach(() => {
    localStorage.clear()
    html = document.documentElement

    // Limpiar atributos previos en el HTML
    const attributes = [
      'data-text-scale',
      'data-accessible-font',
      'data-line-height',
      'data-horizontal-spacing',
      'data-large-cursor',
      'data-reduced-motion',
      'data-theme',
      'data-invert-colors',
      'data-grayscale',
      'data-saturation',
      'data-daltonism'
    ]
    attributes.forEach((attr) => html.removeAttribute(attr))

    store = new AppStore({
      activeMapId: 'mapa-1',
      activeTool: 'select',
      activeColor: '#FFF4B0',
      activeStrokeWidth: 8,
    })

    manager = new AccessibilityManager(store)
  })

  afterEach(() => {
    if (manager) {
      manager.destroy()
    }
  })

  it('debería lanzar un error si no se le provee un store en el constructor', () => {
    expect(() => new AccessibilityManager()).toThrow(TypeError)
  })

  it('debería inyectar los atributos data-* correspondientes en la etiqueta html al inicializarse', () => {
    manager.init()

    expect(html.getAttribute('data-text-scale')).toBe('default')
    expect(html.getAttribute('data-accessible-font')).toBe('false')
    expect(html.getAttribute('data-line-height')).toBe('default')
    expect(html.getAttribute('data-horizontal-spacing')).toBe('default')
    expect(html.getAttribute('data-large-cursor')).toBe('false')
    expect(html.getAttribute('data-reduced-motion')).toBe('system')
    expect(html.getAttribute('data-theme')).toBe('default')
    expect(html.getAttribute('data-invert-colors')).toBe('false')
    expect(html.getAttribute('data-grayscale')).toBe('false')
    expect(html.getAttribute('data-saturation')).toBe('default')
    expect(html.getAttribute('data-daltonism')).toBe('none')
  })

  it('debería sincronizar los cambios de preferencias de tipografía desde el store hacia el DOM', () => {
    manager.init()

    // 1. Tamaño de texto
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'textScale', value: 'xlarge' }
    })
    expect(html.getAttribute('data-text-scale')).toBe('xlarge')

    // 2. Fuente legible
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'accessibleFont', value: true }
    })
    expect(html.getAttribute('data-accessible-font')).toBe('true')

    // 3. Interlineado
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'lineHeight', value: 'double' }
    })
    expect(html.getAttribute('data-line-height')).toBe('double')

    // 4. Espaciado horizontal
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'horizontalSpacing', value: 'large' }
    })
    expect(html.getAttribute('data-horizontal-spacing')).toBe('large')
  })

  it('debería sincronizar el cursor grande', () => {
    manager.init()

    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'largeCursor', value: true }
    })
    expect(html.getAttribute('data-large-cursor')).toBe('true')
  })

  it('debería mapear correctamente reducedMotion al DOM según el triestado', () => {
    manager.init()

    // system -> 'system'
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'reducedMotion', value: 'system' }
    })
    expect(html.getAttribute('data-reduced-motion')).toBe('system')

    // enabled -> 'true'
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'reducedMotion', value: 'enabled' }
    })
    expect(html.getAttribute('data-reduced-motion')).toBe('true')

    // disabled -> 'false'
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'reducedMotion', value: 'disabled' }
    })
    expect(html.getAttribute('data-reduced-motion')).toBe('false')
  })

  it('debería dejar de escuchar cambios al destruirse (unsubscribe)', () => {
    manager.init()

    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'textScale', value: 'large' }
    })
    expect(html.getAttribute('data-text-scale')).toBe('large')

    manager.destroy()

    // Cambiar preferencia de nuevo
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'textScale', value: 'xlarge' }
    })
    
    // El DOM no debe haber cambiado tras el destroy
    expect(html.getAttribute('data-text-scale')).toBe('large')
  })

  it('debería manejar múltiples cambios secuenciales de forma correcta sin duplicar suscripciones', () => {
    manager.init()
    manager.init() // Doble init no debería crear listeners paralelos

    const subscribeSpy = vi.spyOn(store, 'subscribe')
    manager.init()
    expect(subscribeSpy).not.toHaveBeenCalled() // No re-suscribe si ya hay suscripción activa

    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'textScale', value: 'xlarge' }
    })
    expect(html.getAttribute('data-text-scale')).toBe('xlarge')

    subscribeSpy.mockRestore()
  })

  it('debería sincronizar las preferencias cromáticas (contraste, inversión, escala de grises, saturación) desde el store al DOM', () => {
    manager.init()

    // 1. Contraste (tema)
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'contrast', value: 'hc-dark' }
    })
    expect(html.getAttribute('data-theme')).toBe('hc-dark')

    // 2. Inversión
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'invertColors', value: true }
    })
    expect(html.getAttribute('data-invert-colors')).toBe('true')

    // 3. Grayscale (Escala de grises)
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'grayscale', value: true }
    })
    expect(html.getAttribute('data-grayscale')).toBe('true')
    // Comprobar que por exclusión en AppStore, se limpian contrast e invertColors en el DOM
    expect(html.getAttribute('data-invert-colors')).toBe('false')
    expect(html.getAttribute('data-theme')).toBe('default')

    // 4. Saturación
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'saturation', value: 'reduced' }
    })
    expect(html.getAttribute('data-saturation')).toBe('reduced')

    // 5. Daltonismo
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'daltonism', value: 'protanopia' }
    })
    expect(html.getAttribute('data-daltonism')).toBe('protanopia')
    // Comprobar exclusión (apaga grayscale y saturation)
    expect(html.getAttribute('data-grayscale')).toBe('false')
  })
})
