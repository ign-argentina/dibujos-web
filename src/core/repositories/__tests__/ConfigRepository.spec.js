import { describe, it, expect, beforeEach } from 'vitest'
import { configRepository } from '../ConfigRepository.js'

describe('ConfigRepository', () => {
  beforeEach(() => {
    // Resetear el estado de la configuración antes de cada prueba
    configRepository.config = null
  })

  it('debería retornar "imageUrl" por defecto si el config es nulo', () => {
    expect(configRepository.getMapImageSource()).toBe('imageUrl')
  })

  it('debería retornar "imageUrl" si no está especificada la propiedad mapImageSource en el config', () => {
    configRepository.config = {
      maps: [],
      stickers: []
    }
    expect(configRepository.getMapImageSource()).toBe('imageUrl')
  })

  it('debería retornar el origen de imagen configurado como "imagePath"', () => {
    configRepository.config = {
      mapImageSource: 'imagePath',
      maps: [],
      stickers: []
    }
    expect(configRepository.getMapImageSource()).toBe('imagePath')
  })

  it('debería retornar el origen de imagen configurado como "imageUrl"', () => {
    configRepository.config = {
      mapImageSource: 'imageUrl',
      maps: [],
      stickers: []
    }
    expect(configRepository.getMapImageSource()).toBe('imageUrl')
  })

  it('debería retornar externalResources configurado o null por defecto', () => {
    expect(configRepository.getExternalResources()).toBeNull()

    const mockResources = {
      tab: { id: 'links', label: 'Enlaces', title: 'Recursos', icon: 'external-link' },
      items: [{ id: '1', title: 'IGN', url: 'https://www.ign.gob.ar' }]
    }
    configRepository.config = {
      ui: { externalResources: mockResources }
    }
    expect(configRepository.getExternalResources()).toEqual(mockResources)
  })
})
