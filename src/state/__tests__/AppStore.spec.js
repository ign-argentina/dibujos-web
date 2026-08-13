import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AppStore, DEFAULT_ACCESSIBILITY } from '../AppStore.js'

describe('AppStore', () => {
  let store

  beforeEach(() => {
    localStorage.clear()
    store = new AppStore({
      activeMapId: 'mapa-1',
      activeTool: 'select',
      activeColor: '#FFF4B0',
      activeStrokeWidth: 8,
    })
  })

  it('debería inicializarse con el estado proveído y accesibilidad por defecto', () => {
    const state = store.getState()
    expect(state.activeMapId).toBe('mapa-1')
    expect(state.activeTool).toBe('select')
    expect(state.activeColor).toBe('#FFF4B0')
    expect(state.activeStrokeWidth).toBe(8)
    expect(state.accessibility).toEqual(DEFAULT_ACCESSIBILITY)
  })

  it('debería suscribir un callback y llamarlo inmediatamente con el estado actual', () => {
    const callback = vi.fn()
    const unsubscribe = store.subscribe(callback)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(store.getState())
    unsubscribe()
  })

  it('debería mutar el estado y disparar a los suscriptores al despachar SET_ACTIVE_MAP_ID', () => {
    const callback = vi.fn()
    const unsubscribe = store.subscribe(callback)

    callback.mockClear()

    store.dispatch({ type: 'SET_ACTIVE_MAP_ID', payload: 'mapa-2' })

    expect(store.getState().activeMapId).toBe('mapa-2')
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(store.getState())

    unsubscribe()
  })

  it('debería no disparar a los suscriptores si el estado no cambió', () => {
    const callback = vi.fn()
    const unsubscribe = store.subscribe(callback)

    callback.mockClear()

    store.dispatch({ type: 'SET_ACTIVE_MAP_ID', payload: 'mapa-1' }) // Mismo ID

    expect(callback).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('debería mutar el estado al despachar SET_ACTIVE_TOOL', () => {
    store.dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'brush' })
    expect(store.getState().activeTool).toBe('brush')
  })

  it('debería mutar el estado al despachar SET_ACTIVE_COLOR', () => {
    store.dispatch({ type: 'SET_ACTIVE_COLOR', payload: '#000000' })
    expect(store.getState().activeColor).toBe('#000000')
  })

  it('debería mutar el estado al despachar SET_ACTIVE_STROKE_WIDTH', () => {
    store.dispatch({ type: 'SET_ACTIVE_STROKE_WIDTH', payload: 12 })
    expect(store.getState().activeStrokeWidth).toBe(12)
  })

  /* --- PRUEBAS DEL MÓDULO DE ACCESIBILIDAD --- */

  it('debería permitir cambiar una preferencia válida de accesibilidad', () => {
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'textScale', value: 'large' }
    })
    expect(store.getState().accessibility.textScale).toBe('large')
  })

  it('debería ignorar cambios en preferencias de accesibilidad inválidas o con valores no soportados', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'textScale', value: 'huge' } // Valor inválido
    })
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'nonExistentKey', value: true } // Clave inválida
    })

    expect(store.getState().accessibility.textScale).toBe('default')
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2)
    consoleWarnSpy.mockRestore()
  })

  it('debería aplicar las exclusiones al activar Invertir Colores', () => {
    // Primero activar grayscale y daltonismo
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'grayscale', value: true }
    })
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'daltonism', value: 'deuteranopia' }
    })

    // Activar invertColors
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'invertColors', value: true }
    })

    const access = store.getState().accessibility
    expect(access.invertColors).toBe(true)
    expect(access.grayscale).toBe(false)
    expect(access.daltonism).toBe('none')
  })

  it('debería aplicar las exclusiones al activar Escala de Grises', () => {
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'invertColors', value: true }
    })
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'contrast', value: 'hc-dark' }
    })

    // Activar grayscale
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'grayscale', value: true }
    })

    const access = store.getState().accessibility
    expect(access.grayscale).toBe(true)
    expect(access.invertColors).toBe(false)
    expect(access.contrast).toBe('default')
  })

  it('debería aplicar las exclusiones al activar Daltonismo', () => {
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'grayscale', value: true }
    })

    // Activar daltonismo
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'daltonism', value: 'protanopia' }
    })

    const access = store.getState().accessibility
    expect(access.daltonism).toBe('protanopia')
    expect(access.grayscale).toBe(false)
  })

  it('debería permitir reducir movimiento triestado', () => {
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'reducedMotion', value: 'enabled' }
    })
    expect(store.getState().accessibility.reducedMotion).toBe('enabled')

    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'reducedMotion', value: 'disabled' }
    })
    expect(store.getState().accessibility.reducedMotion).toBe('disabled')

    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'reducedMotion', value: 'system' }
    })
    expect(store.getState().accessibility.reducedMotion).toBe('system')
  })

  it('debería limpiar persistencia y restaurar predeterminados al despachar RESET_ACCESSIBILITY', () => {
    store.dispatch({
      type: 'SET_ACCESSIBILITY_PREFERENCE',
      payload: { key: 'textScale', value: 'xlarge' }
    })
    expect(store.getState().accessibility.textScale).toBe('xlarge')
    expect(localStorage.getItem('ign_accessibility_settings')).not.toBeNull()

    store.dispatch({ type: 'RESET_ACCESSIBILITY' })

    expect(store.getState().accessibility).toEqual(DEFAULT_ACCESSIBILITY)
    expect(localStorage.getItem('ign_accessibility_settings')).toBeNull()
  })

  it('debería cargar preferencias guardadas en localStorage al instanciarse', () => {
    const savedData = {
      version: 1,
      settings: {
        textScale: 'xlarge',
        invertColors: true
      }
    }
    localStorage.setItem('ign_accessibility_settings', JSON.stringify(savedData))

    const newStore = new AppStore()
    const access = newStore.getState().accessibility
    expect(access.textScale).toBe('xlarge')
    expect(access.invertColors).toBe(true)
    // El resto debe ser por defecto
    expect(access.grayscale).toBe(false)
  })

  it('debería tolerar JSON corrupto en localStorage cargando valores por defecto', () => {
    localStorage.setItem('ign_accessibility_settings', 'invalid-json-{')
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const newStore = new AppStore()
    expect(newStore.getState().accessibility).toEqual(DEFAULT_ACCESSIBILITY)
    consoleErrorSpy.mockRestore()
  })

  it('debería tolerar valores no válidos en localStorage recuperando defaults únicamente para esos campos', () => {
    const savedData = {
      version: 1,
      settings: {
        textScale: 'huge', // Inválido
        invertColors: true // Válido
      }
    }
    localStorage.setItem('ign_accessibility_settings', JSON.stringify(savedData))

    const newStore = new AppStore()
    const access = newStore.getState().accessibility
    expect(access.textScale).toBe('default') // Recupera el default
    expect(access.invertColors).toBe(true)   // Respeta el válido
  })
})
