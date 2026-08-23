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

  it('debería retornar stroke, export, theme y colorPalette o sus valores por defecto', () => {
    expect(configRepository.getStrokeConfig()).toEqual({ min: 2, max: 24, default: 4 })
    expect(configRepository.getThemeConfig()).toBeNull()
    expect(configRepository.getColorPalette()).toBeNull()

    configRepository.config = {
      ui: {
        stroke: { min: 4, max: 30, default: 8 },
        export: { filenamePrefix: 'custom_', defaultFormat: 'png', defaultPaper: 'Oficio', defaultQuality: 3, defaultScale: 150 },
        theme: { primary: '#123456' },
        colorPalette: ['#111111', '#222222']
      }
    }

    expect(configRepository.getStrokeConfig()).toEqual({ min: 4, max: 30, default: 8 })
    expect(configRepository.getExportFilenamePrefix()).toBe('custom_')
    expect(configRepository.getExportConfig().defaultPaper).toBe('Oficio')
    expect(configRepository.getThemeConfig()).toEqual({ primary: '#123456' })
    expect(configRepository.getColorPalette()).toEqual(['#111111', '#222222'])
  })
})
