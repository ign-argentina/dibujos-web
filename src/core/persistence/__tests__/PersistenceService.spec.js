import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PersistenceService, isQuotaExceededError } from '../PersistenceService.js'

describe('PersistenceService', () => {
  let mockStorage
  let service

  beforeEach(() => {
    mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }
    service = new PersistenceService(mockStorage)
  })

  it('debería guardar y recuperar datos correctamente', () => {
    service.save('test-key', 'test-value')
    expect(mockStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value')

    mockStorage.getItem.mockReturnValue('test-value')
    const val = service.load('test-key')
    expect(mockStorage.getItem).toHaveBeenCalledWith('test-key')
    expect(val).toBe('test-value')
  })

  it('debería remover datos correctamente', () => {
    service.remove('test-key')
    expect(mockStorage.removeItem).toHaveBeenCalledWith('test-key')
  })

  it('debería guardar con debounce agrupando llamadas rápidas', async () => {
    vi.useFakeTimers()

    service.saveDebounced('debounce-key', 'val-1', 100)
    service.saveDebounced('debounce-key', 'val-2', 100)

    expect(mockStorage.setItem).not.toHaveBeenCalled()

    // Avanzar el reloj 100ms
    vi.advanceTimersByTime(100)

    expect(mockStorage.setItem).toHaveBeenCalledTimes(1)
    expect(mockStorage.setItem).toHaveBeenCalledWith('debounce-key', 'val-2')

    vi.useRealTimers()
  })

  describe('Eventos y Manejo de Errores', () => {
    it('debería clasificar correctamente los errores de cuota', () => {
      const quotaErr1 = new DOMException('Quota exceeded', 'QuotaExceededError')
      const quotaErr2 = { name: 'NS_ERROR_DOM_QUOTA_REACHED', code: 1014 }
      const quotaErr3 = { code: 22 }
      const genericErr = new Error('Generic storage error')

      expect(isQuotaExceededError(quotaErr1)).toBe(true)
      expect(isQuotaExceededError(quotaErr2)).toBe(true)
      expect(isQuotaExceededError(quotaErr3)).toBe(true)
      expect(isQuotaExceededError(genericErr)).toBe(false)
      expect(isQuotaExceededError(null)).toBe(false)
      expect(isQuotaExceededError(undefined)).toBe(false)
    })

    it('debería emitir el evento "success" cuando el guardado es exitoso', () => {
      const listener = vi.fn()
      service.on('success', listener)

      service.save('key', 'value')
      expect(listener).toHaveBeenCalledWith('key')
    })

    it('debería emitir el evento "success" cuando la remoción es exitosa', () => {
      const listener = vi.fn()
      service.on('success', listener)

      service.remove('key')
      expect(listener).toHaveBeenCalledWith('key')
    })

    it('debería emitir el evento "error" con los detalles cuando setItem lanza un error', () => {
      const quotaErr = new DOMException('Quota exceeded', 'QuotaExceededError')
      mockStorage.setItem.mockImplementation(() => {
        throw quotaErr
      })

      const errorListener = vi.fn()
      service.on('error', errorListener)

      service.save('key', 'value')

      expect(errorListener).toHaveBeenCalledTimes(1)
      expect(errorListener).toHaveBeenCalledWith(quotaErr, 'key', 'value')
    })

    it('debería permitir desuscribir listeners usando "off"', () => {
      const listener = vi.fn()
      service.on('success', listener)
      service.off('success', listener)

      service.save('key', 'value')
      expect(listener).not.toHaveBeenCalled()
    })
  })
})
