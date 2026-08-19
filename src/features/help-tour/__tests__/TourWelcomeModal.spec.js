import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TourWelcomeModal } from '../TourWelcomeModal.js'

describe('TourWelcomeModal', () => {
  let container

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'modal-root'
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('debería renderizar la estructura accesible del modal de bienvenida', () => {
    const modal = new TourWelcomeModal(container)
    modal.mount()

    const modalEl = container.querySelector('#tour-welcome-modal')
    expect(modalEl).not.toBeNull()
    expect(modalEl.getAttribute('role')).toBe('dialog')
    expect(modalEl.getAttribute('aria-modal')).toBe('true')
    expect(modalEl.getAttribute('aria-labelledby')).toBe('tour-welcome-title')
    expect(modalEl.getAttribute('aria-describedby')).toBe('tour-welcome-desc')

    expect(container.querySelector('#tour-welcome-title').textContent).toContain('¿Querés conocer las herramientas?')
    expect(container.querySelector('#tour-welcome-dont-show')).not.toBeNull()
    expect(container.querySelector('#tour-welcome-start')).not.toBeNull()
    expect(container.querySelector('#tour-welcome-dismiss')).not.toBeNull()

    modal.destroy()
  })

  it('debería abrir y cerrar actualizando visibilidad y foco', () => {
    const triggerBtn = document.createElement('button')
    container.appendChild(triggerBtn)
    triggerBtn.focus()

    const modal = new TourWelcomeModal(container)
    modal.mount()

    expect(modal.isOpen()).toBe(false)

    modal.open(triggerBtn)
    expect(modal.isOpen()).toBe(true)
    expect(container.querySelector('#tour-welcome-modal').classList.contains('hidden')).toBe(false)

    modal.close()
    expect(modal.isOpen()).toBe(false)
    expect(container.querySelector('#tour-welcome-modal').classList.contains('hidden')).toBe(true)

    modal.destroy()
  })

  it('al presionar "Iniciar recorrido" debe invocar onStart pasando el estado del checkbox', () => {
    const onStartMock = vi.fn()
    const modal = new TourWelcomeModal(container, {
      onStart: onStartMock
    })
    modal.mount()
    modal.open()

    // 1. Sin tildar checkbox
    container.querySelector('#tour-welcome-start').click()
    expect(onStartMock).toHaveBeenCalledWith({ dontShowAgain: false })
    expect(modal.isOpen()).toBe(false)

    // 2. Tildando checkbox
    modal.open()
    container.querySelector('#tour-welcome-dont-show').checked = true
    container.querySelector('#tour-welcome-start').click()
    expect(onStartMock).toHaveBeenCalledWith({ dontShowAgain: true })

    modal.destroy()
  })

  it('al presionar "Ahora no" debe invocar onDismiss pasando el estado del checkbox', () => {
    const onDismissMock = vi.fn()
    const modal = new TourWelcomeModal(container, {
      onDismiss: onDismissMock
    })
    modal.mount()
    modal.open()

    container.querySelector('#tour-welcome-dont-show').checked = true
    container.querySelector('#tour-welcome-dismiss').click()

    expect(onDismissMock).toHaveBeenCalledWith({ dontShowAgain: true })
    expect(modal.isOpen()).toBe(false)

    modal.destroy()
  })

  it('debería responder a Escape y al clic fuera del diálogo', () => {
    const onDismissMock = vi.fn()
    const modal = new TourWelcomeModal(container, {
      onDismiss: onDismissMock
    })
    modal.mount()
    modal.open()

    // Escape
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onDismissMock).toHaveBeenCalledTimes(1)
    expect(modal.isOpen()).toBe(false)

    // Clic en backdrop
    modal.open()
    const modalBackdrop = container.querySelector('#tour-welcome-modal')
    modalBackdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onDismissMock).toHaveBeenCalledTimes(2)

    modal.destroy()
  })

  it('debería ciclar el foco con Tab y Shift+Tab (Focus Trap)', () => {
    const modal = new TourWelcomeModal(container)
    modal.mount()
    modal.open()

    const closeBtn = container.querySelector('#tour-welcome-close')
    const startBtn = container.querySelector('#tour-welcome-start')

    // Si el foco está en el último elemento (startBtn) y presiona Tab -> va al primero (closeBtn)
    startBtn.focus()
    expect(document.activeElement).toBe(startBtn)

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    document.dispatchEvent(tabEvent)
    expect(document.activeElement).toBe(closeBtn)

    // Si el foco está en el primer elemento (closeBtn) y presiona Shift+Tab -> va al último (startBtn)
    closeBtn.focus()
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(shiftTabEvent)
    expect(document.activeElement).toBe(startBtn)

    modal.destroy()
  })
})
