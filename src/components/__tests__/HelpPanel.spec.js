import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { HelpPanel } from '../HelpPanel.js'

describe('HelpPanel', () => {
  let container

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'view-help'
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('debería renderizar la estructura accesible del panel con título, descripción y nota', () => {
    const helpPanel = new HelpPanel(container)
    helpPanel.mount()

    const region = container.querySelector('.nbi-help-panel')
    expect(region).not.toBeNull()
    expect(region.getAttribute('role')).toBe('region')
    expect(region.getAttribute('aria-label')).toBe('Controles de Ayuda y Tutoriales')

    const title = container.querySelector('.nbi-help-card__title')
    expect(title).not.toBeNull()
    expect(title.textContent).toBe('Recorrido guiado')

    const description = container.querySelector('.nbi-help-card__description')
    expect(description).not.toBeNull()
    expect(description.textContent).toContain('herramientas y funciones')

    const note = container.querySelector('.nbi-help-card__note')
    expect(note).not.toBeNull()
    expect(note.textContent).toContain('siempre que lo necesites')

    helpPanel.destroy()
  })

  it('debería renderizar el botón "Iniciar recorrido" con la clase de estilo secondary', () => {
    const helpPanel = new HelpPanel(container)
    helpPanel.mount()

    const startBtn = container.querySelector('#btn-start-tour')
    expect(startBtn).not.toBeNull()
    expect(startBtn.tagName.toLowerCase()).toBe('button')
    expect(startBtn.type).toBe('button')
    expect(startBtn.classList.contains('nbi-btn')).toBe(true)
    expect(startBtn.classList.contains('nbi-btn--secondary')).toBe(true)
    expect(startBtn.textContent).toContain('Iniciar recorrido')
    expect(startBtn.getAttribute('aria-label')).toBe('Iniciar recorrido guiado por la aplicación')

    helpPanel.destroy()
  })

  it('debería disparar la callback onStartTour al hacer clic en el botón de inicio', () => {
    const onStartTourMock = vi.fn()
    const helpPanel = new HelpPanel(container, { onStartTour: onStartTourMock })
    helpPanel.mount()

    const startBtn = container.querySelector('#btn-start-tour')
    expect(onStartTourMock).not.toHaveBeenCalled()

    startBtn.click()
    expect(onStartTourMock).toHaveBeenCalledTimes(1)

    helpPanel.destroy()
  })

  it('no debería fallar al hacer clic si onStartTour no fue especificado', () => {
    const helpPanel = new HelpPanel(container)
    helpPanel.mount()

    const startBtn = container.querySelector('#btn-start-tour')
    expect(() => {
      startBtn.click()
    }).not.toThrow()

    helpPanel.destroy()
  })

  it('debería limpiar el contenedor y desvincular eventos al llamar unmount', () => {
    const onStartTourMock = vi.fn()
    const helpPanel = new HelpPanel(container, { onStartTour: onStartTourMock })
    helpPanel.mount()

    expect(container.innerHTML).not.toBe('')
    const startBtn = container.querySelector('#btn-start-tour')

    helpPanel.unmount()
    expect(container.innerHTML).toBe('')

    // Verificar que un clic no dispare la callback tras unmount
    startBtn.click()
    expect(onStartTourMock).not.toHaveBeenCalled()
  })
})
