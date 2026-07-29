import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AppStore } from '../AppStore.js'

describe('AppStore', () => {
  let store

  beforeEach(() => {
    store = new AppStore({
      activeMapId: 'mapa-1',
      activeTool: 'select',
      activeColor: '#FFF4B0',
      activeStrokeWidth: 8,
    })
  })

  it('debería inicializarse con el estado proveído', () => {
    const state = store.getState()
    expect(state.activeMapId).toBe('mapa-1')
    expect(state.activeTool).toBe('select')
    expect(state.activeColor).toBe('#FFF4B0')
    expect(state.activeStrokeWidth).toBe(8)
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

    // resetear llamadas del trigger inicial inmediato
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
})
