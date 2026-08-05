import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mapRepository } from '../MapRepository.js'
import { configRepository } from '../ConfigRepository.js'

describe('MapRepository', () => {
  beforeEach(() => {
    // Resetear el estado de la configuración cargada
    configRepository.config = null
    vi.restoreAllMocks()
  })

  it('debería retornar el listado completo de mapas desde el config unificado', async () => {
    const mockConfig = {
      maps: [
        { id: 'mapa-1', name: 'Mapa 1', isPortrait: true },
        { id: 'mapa-2', name: 'Mapa 2', isPortrait: false },
      ],
      stickers: ['sticker-1'],
    }

    // Mockear la llamada fetch global
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockConfig,
    })

    const maps = await mapRepository.getAll()
    expect(maps).toHaveLength(2)
    expect(maps[0].id).toBe('mapa-1')
    expect(maps[1].name).toBe('Mapa 2')
  })

  it('debería retornar un mapa específico por su id', async () => {
    const mockConfig = {
      maps: [
        { id: 'mapa-1', name: 'Mapa 1', isPortrait: true },
        { id: 'mapa-2', name: 'Mapa 2', isPortrait: false },
      ],
      stickers: [],
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockConfig,
    })

    const map = await mapRepository.getById('mapa-2')
    expect(map).not.toBeNull()
    expect(map.id).toBe('mapa-2')
    expect(map.isPortrait).toBe(false)
  })

  it('debería retornar null si el mapa no existe', async () => {
    const mockConfig = {
      maps: [{ id: 'mapa-1', name: 'Mapa 1', isPortrait: true }],
      stickers: [],
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockConfig,
    })

    const map = await mapRepository.getById('mapa-no-existente')
    expect(map).toBeNull()
  })
})
