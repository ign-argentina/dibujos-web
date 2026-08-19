import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TourStorage, TOUR_STORAGE_KEY } from '../TourStorage.js'

describe('TourStorage', () => {
  let mockPersistenceService
  let storageMap

  beforeEach(() => {
    storageMap = new Map()
    mockPersistenceService = {
      load: vi.fn((key) => storageMap.get(key) || null),
      save: vi.fn((key, val) => storageMap.set(key, val)),
      remove: vi.fn((key) => storageMap.delete(key))
    }
  })

  it('debería retornar configuración por defecto cuando no hay datos guardados', () => {
    const settings = TourStorage.loadSettings(mockPersistenceService)

    expect(settings).toBeDefined()
    expect(settings.tours.general).toEqual({ completedVersion: 0, dismissedAutoPromptVersion: 0 })
    expect(settings.tours.drawing).toEqual({ completedVersion: 0, dismissedAutoPromptVersion: 0 })
  })

  it('debería recuperarse ante JSON corrupto o inválido retornando defaults seguros', () => {
    storageMap.set(TOUR_STORAGE_KEY, '{ invalid-json :::')

    const settings = TourStorage.loadSettings(mockPersistenceService)
    expect(settings).toBeDefined()
    expect(settings.tours.general.completedVersion).toBe(0)
  })

  it('debería persistir y recuperar completedVersion correctamente', () => {
    expect(TourStorage.isTourCompleted('general', 1, mockPersistenceService)).toBe(false)

    TourStorage.setTourCompleted('general', 1, mockPersistenceService)

    expect(TourStorage.isTourCompleted('general', 1, mockPersistenceService)).toBe(true)
    expect(TourStorage.isTourCompleted('general', 2, mockPersistenceService)).toBe(false)
  })

  it('debería persistir y recuperar dismissedAutoPromptVersion correctamente', () => {
    expect(TourStorage.isAutoPromptDismissed('general', 1, mockPersistenceService)).toBe(false)

    TourStorage.setTourAutoPromptDismissed('general', 1, mockPersistenceService)

    expect(TourStorage.isAutoPromptDismissed('general', 1, mockPersistenceService)).toBe(true)
    expect(TourStorage.isAutoPromptDismissed('general', 2, mockPersistenceService)).toBe(false)
  })

  it('shouldShowAutoPrompt debe devolver true en primera visita y false si fue completado o descartado', () => {
    // 1. Primera visita (sin datos)
    expect(TourStorage.shouldShowAutoPrompt('general', 1, mockPersistenceService)).toBe(true)

    // 2. Si se descarta para v1
    TourStorage.setTourAutoPromptDismissed('general', 1, mockPersistenceService)
    expect(TourStorage.shouldShowAutoPrompt('general', 1, mockPersistenceService)).toBe(false)

    // 3. Pero si el tour se actualiza a v2, debe volver a ofrecerse
    expect(TourStorage.shouldShowAutoPrompt('general', 2, mockPersistenceService)).toBe(true)
  })

  it('shouldShowAutoPrompt debe devolver false si el tour ya fue completado', () => {
    TourStorage.setTourCompleted('general', 1, mockPersistenceService)
    expect(TourStorage.shouldShowAutoPrompt('general', 1, mockPersistenceService)).toBe(false)
  })

  it('debería manejar errores de almacenamiento sin lanzar excepciones', () => {
    const failingService = {
      load: () => {
        throw new Error('Storage disabled')
      },
      save: () => {
        throw new Error('Quota exceeded')
      }
    }

    expect(() => TourStorage.loadSettings(failingService)).not.toThrow()
    expect(() => TourStorage.setTourCompleted('general', 1, failingService)).not.toThrow()
  })
})
