import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StickersPanel } from '../StickersPanel.js'

vi.mock('../../../core/repositories/StickerRepository.js', () => ({
  stickerRepository: {
    getCategorized: vi.fn().mockResolvedValue([
      {
        name: 'Categoría A',
        stickers: ['sticker1', 'sticker2'],
      }
    ])
  }
}))

describe('StickersPanel', () => {
  let container
  let mockCanvasManager

  beforeEach(() => {
    container = document.createElement('div')
    container.innerHTML = `
      <button id="tool-stickers"></button>
      <button id="toggle-stickers-btn"></button>
      <div id="stickers-panel" class="hidden"></div>
      <div id="stickers-container"></div>
    `
    document.body.appendChild(container)

    mockCanvasManager = {
      addSticker: vi.fn(),
    }
  })

  afterEach(() => {
    container.remove()
  })

  it('debería renderizar las categorías y stickers', async () => {
    const panel = new StickersPanel(container, { canvasManager: mockCanvasManager })
    panel.mount()
    await new Promise(resolve => setTimeout(resolve, 0))

    const sections = container.querySelectorAll('#stickers-container .nbi-stickers__category')
    expect(sections.length).toBe(1)
    expect(sections[0].querySelector('.nbi-stickers__category-title').textContent).toBe('Categoría A')

    const items = sections[0].querySelectorAll('.nbi-stickers__item')
    expect(items.length).toBe(2)
  })

  it('debería agregar un sticker al hacer click e interactuar con el canvasManager una sola vez', async () => {
    const panel = new StickersPanel(container, { canvasManager: mockCanvasManager })
    panel.mount()
    await new Promise(resolve => setTimeout(resolve, 0))

    const items = container.querySelectorAll('.nbi-stickers__item')
    items[0].click()

    expect(mockCanvasManager.addSticker).toHaveBeenCalledTimes(1)
    expect(mockCanvasManager.addSticker).toHaveBeenCalledWith(expect.stringContaining('stickers/sticker1.svg'))
  })

  it('debería permitir múltiples renders sin duplicar callbacks', async () => {
    const panel = new StickersPanel(container, { canvasManager: mockCanvasManager })
    panel.mount()
    await new Promise(resolve => setTimeout(resolve, 0))
    await panel.render() // Segundo render

    const items = container.querySelectorAll('.nbi-stickers__item')
    items[1].click()

    expect(mockCanvasManager.addSticker).toHaveBeenCalledTimes(1)
    expect(mockCanvasManager.addSticker).toHaveBeenCalledWith(expect.stringContaining('stickers/sticker2.svg'))
  })

  it('debería limpiar todos los listeners al desmontarse/destruirse', async () => {
    const panel = new StickersPanel(container, { canvasManager: mockCanvasManager })
    panel.mount()
    await new Promise(resolve => setTimeout(resolve, 0))

    panel.destroy()

    const items = container.querySelectorAll('.nbi-stickers__item')
    items[0].click()

    expect(mockCanvasManager.addSticker).not.toHaveBeenCalled()
  })
})
