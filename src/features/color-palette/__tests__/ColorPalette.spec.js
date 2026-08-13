import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ColorPalette } from '../ColorPalette.js'

vi.mock('../../../core/repositories/ConfigRepository.js', () => ({
  configRepository: {
    getUiConfig: () => ({
      colorPalette: ['#FFA2A2', '#82D3F8', '#7ABE7D', '#E289F2', '#A5A5A5', '#000000']
    })
  }
}))

describe('ColorPalette', () => {
  let container
  let mockCanvasManager

  beforeEach(() => {
    container = document.createElement('div')
    container.innerHTML = `
      <div id="color-chips-container"></div>
      <div id="recent-colors-container"></div>
      <input type="range" id="stroke-slider" />
      <span id="stroke-value-display"></span>
      <input type="color" id="custom-color-picker" />
      <div id="properties-panel"></div>
      <button id="toggle-properties-btn"></button>
    `
    document.body.appendChild(container)

    mockCanvasManager = {
      activeColor: '#FFA2A2',
      activeStrokeWidth: 5,
      setActiveColor: vi.fn(),
      setActiveStrokeWidth: vi.fn(),
    }
  })

  afterEach(() => {
    container.remove()
  })

  it('debería renderizar la paleta de colores y chips de color', () => {
    const palette = new ColorPalette(container, { canvasManager: mockCanvasManager })
    palette.mount()

    const chips = container.querySelectorAll('#color-chips-container .nbi-color-chip')
    expect(chips.length).toBe(6)
    expect(chips[0].getAttribute('data-color')).toBe('#FFA2A2')
  })

  it('debería seleccionar un color al hacer click e interactuar con el canvasManager una sola vez', () => {
    const palette = new ColorPalette(container, { canvasManager: mockCanvasManager })
    palette.mount()

    const chips = container.querySelectorAll('#color-chips-container .nbi-color-chip')
    chips[1].click() // Click on second chip (#82D3F8)

    expect(mockCanvasManager.setActiveColor).toHaveBeenCalledTimes(1)
    expect(mockCanvasManager.setActiveColor).toHaveBeenCalledWith('#82D3F8')
  })

  it('debería permitir múltiples renders sin duplicar callbacks al hacer click', () => {
    const palette = new ColorPalette(container, { canvasManager: mockCanvasManager })
    palette.mount()

    // Llamar a render múltiples veces
    palette.render()
    palette.render()

    const chips = container.querySelectorAll('#color-chips-container .nbi-color-chip')
    chips[2].click() // Click on third chip (#7ABE7D)

    // Se debería llamar a setActiveColor solo una vez, ya que los listeners se delegaron
    expect(mockCanvasManager.setActiveColor).toHaveBeenCalledTimes(1)
    expect(mockCanvasManager.setActiveColor).toHaveBeenCalledWith('#7ABE7D')
  })

  it('debería limpiar todos los listeners al desmontarse/destruirse', () => {
    const palette = new ColorPalette(container, { canvasManager: mockCanvasManager })
    palette.mount()

    palette.destroy()

    const chips = container.querySelectorAll('#color-chips-container .nbi-color-chip')
    chips[1].click()

    expect(mockCanvasManager.setActiveColor).not.toHaveBeenCalled()
  })
})
