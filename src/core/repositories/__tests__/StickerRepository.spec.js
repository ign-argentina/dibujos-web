import { describe, it, expect, beforeEach } from 'vitest'
import { stickerRepository } from '../StickerRepository.js'
import { configRepository } from '../ConfigRepository.js'

describe('StickerRepository', () => {
  beforeEach(() => {
    configRepository.config = null
  })

  it('debería clasificar correctamente los stickers en base al config', async () => {
    configRepository.config = {
      stickers: [
        'mapa-argentina',
        'provincia-buenosaires',
        'agua',
        'clima-lluvia',
        'ganaderia',
        'auto',
        'ciencia',
        'corazon'
      ]
    }

    const categorized = await stickerRepository.getCategorized()

    expect(categorized).toHaveLength(6)

    // Territorio y sociedad
    expect(categorized[0].name).toBe('Territorio y sociedad')
    expect(categorized[0].stickers).toContain('mapa-argentina')
    expect(categorized[0].stickers).toContain('provincia-buenosaires')
    expect(categorized[0].stickers).not.toContain('agua')

    // Ambiente y naturaleza
    expect(categorized[1].name).toBe('Ambiente y naturaleza')
    expect(categorized[1].stickers).toContain('agua')
    expect(categorized[1].stickers).toContain('clima-lluvia')

    // Producción y economía
    expect(categorized[2].name).toBe('Producción y economía')
    expect(categorized[2].stickers).toContain('ganaderia')

    // Infraestructura, transporte y energía
    expect(categorized[3].name).toBe('Infraestructura, transporte y energía')
    expect(categorized[3].stickers).toContain('auto')

    // Ciencia, tecnología y actividades
    expect(categorized[4].name).toBe('Ciencia, tecnología y actividades')
    expect(categorized[4].stickers).toContain('ciencia')

    // Recursos gráficos
    expect(categorized[5].name).toBe('Recursos gráficos')
    expect(categorized[5].stickers).toContain('corazon')
  })

  it('debería ignorar los stickers que no coincidan con ninguna categoría y loguear un warning', async () => {
    configRepository.config = {
      stickers: ['non-existent-sticker']
    }

    const categorized = await stickerRepository.getCategorized()

    expect(categorized).toHaveLength(6)
    categorized.forEach(cat => {
      expect(cat.stickers).toHaveLength(0)
    })
  })
})
