import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PersistenceService } from '../PersistenceService.js'

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
})
