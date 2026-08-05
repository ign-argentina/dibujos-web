import { describe, it, expect, vi } from 'vitest'
import { EventBus } from '../EventBus.js'

describe('EventBus', () => {
  it('debería registrar y disparar listeners correctamente', () => {
    const bus = new EventBus()
    const mockCallback = vi.fn()

    bus.on('mi-evento', mockCallback)
    bus.emit('mi-evento', { dato: 123 })

    expect(mockCallback).toHaveBeenCalledTimes(1)
    expect(mockCallback).toHaveBeenCalledWith({ dato: 123 })
  })

  it('debería permitir desuscribirse de un evento', () => {
    const bus = new EventBus()
    const mockCallback = vi.fn()

    const unsubscribe = bus.on('mi-evento', mockCallback)
    unsubscribe()

    bus.emit('mi-evento', { dato: 456 })

    expect(mockCallback).not.toHaveBeenCalled()
  })

  it('debería soportar múltiples listeners independientes para un mismo evento', () => {
    const bus = new EventBus()
    const cb1 = vi.fn()
    const cb2 = vi.fn()

    bus.on('evento-compartido', cb1)
    bus.on('evento-compartido', cb2)

    bus.emit('evento-compartido', 'datos')

    expect(cb1).toHaveBeenCalledWith('datos')
    expect(cb2).toHaveBeenCalledWith('datos')
  })

  it('debería aislar errores en los callbacks y continuar ejecutando los siguientes', () => {
    const bus = new EventBus()
    const cbError = vi.fn().mockImplementation(() => {
      throw new Error('Explosión en callback')
    })
    const cbSuccess = vi.fn()

    // Capturar logs del console.error para no ensuciar la salida
    const spyError = vi.spyOn(console, 'error').mockImplementation(() => {})

    bus.on('evento-fallido', cbError)
    bus.on('evento-fallido', cbSuccess)

    bus.emit('evento-fallido', 'datos')

    expect(cbError).toHaveBeenCalled()
    expect(cbSuccess).toHaveBeenCalledWith('datos')
    expect(spyError).toHaveBeenCalled()

    spyError.mockRestore()
  })
})
