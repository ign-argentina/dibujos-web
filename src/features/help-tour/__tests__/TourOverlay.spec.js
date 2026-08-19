import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TourOverlay } from '../TourOverlay.js'

describe('TourOverlay', () => {
  let container
  let targetEl

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'app-root'
    document.body.appendChild(container)

    targetEl = document.createElement('button')
    targetEl.id = 'sample-target'
    targetEl.setAttribute('data-tour', 'sample')
    targetEl.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      width: 120,
      height: 48,
      right: 220,
      bottom: 148
    })
    container.appendChild(targetEl)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('debería renderizar la estructura accesible completa del overlay y el tooltip', () => {
    const step = {
      id: 'step-1',
      target: '[data-tour="sample"]',
      title: 'Título del Paso',
      text: 'Descripción explicativa del paso.',
      placement: 'bottom'
    }

    const overlay = new TourOverlay(container, {
      step,
      targetElement: targetEl,
      stepIndex: 0,
      totalSteps: 12
    })
    overlay.mount()

    expect(container.querySelector('#tour-overlay-root')).not.toBeNull()
    expect(container.querySelector('.nbi-tour-mask')).not.toBeNull()
    expect(container.querySelector('#tour-spotlight-frame')).not.toBeNull()

    const tooltip = container.querySelector('#tour-tooltip')
    expect(tooltip).not.toBeNull()
    expect(tooltip.getAttribute('role')).toBe('dialog')
    expect(tooltip.getAttribute('aria-modal')).toBe('true')
    expect(tooltip.getAttribute('aria-labelledby')).toBe('tour-step-title')
    expect(tooltip.getAttribute('aria-describedby')).toBe('tour-step-desc')

    expect(container.querySelector('#tour-step-badge').textContent).toBe('Paso 1 de 12')
    expect(container.querySelector('#tour-step-title').textContent).toBe('Título del Paso')
    expect(container.querySelector('#tour-step-desc').textContent).toBe('Descripción explicativa del paso.')

    const announcer = container.querySelector('#tour-live-announcer')
    expect(announcer).not.toBeNull()
    expect(announcer.getAttribute('aria-live')).toBe('polite')
    expect(announcer.textContent).toContain('Paso 1 de 12')

    overlay.destroy()
  })

  it('debería ampliar el recuadro resaltado 5 px adicionales por cada lado', () => {
    const overlay = new TourOverlay(container, {
      step: { id: 's1', title: 'Título', text: 'Texto', placement: 'bottom' },
      targetElement: targetEl
    })
    overlay.mount()

    const frame = container.querySelector('#tour-spotlight-frame')
    expect(frame.style.left).toBe('89px')
    expect(frame.style.top).toBe('89px')
    expect(frame.style.width).toBe('142px')
    expect(frame.style.height).toBe('70px')

    overlay.destroy()
  })

  it('en el primer paso el botón Anterior debe estar deshabilitado', () => {
    const overlay = new TourOverlay(container, {
      step: { id: 's1', title: 'T1', text: 'Txt1', placement: 'bottom' },
      stepIndex: 0,
      totalSteps: 12
    })
    overlay.mount()

    const prevBtn = container.querySelector('#tour-btn-prev')
    expect(prevBtn.disabled).toBe(true)

    const nextBtn = container.querySelector('#tour-btn-next')
    expect(nextBtn.textContent).toContain('Siguiente')
    expect(nextBtn.classList.contains('nbi-btn--secondary')).toBe(true)

    overlay.destroy()
  })

  it('en el último paso el botón Siguiente debe transformarse en Finalizar con estilo success', () => {
    const overlay = new TourOverlay(container, {
      step: { id: 's12', title: 'Último Paso', text: 'Fin del recorrido', placement: 'right' },
      stepIndex: 11,
      totalSteps: 12
    })
    overlay.mount()

    const prevBtn = container.querySelector('#tour-btn-prev')
    expect(prevBtn.disabled).toBe(false)

    const nextBtn = container.querySelector('#tour-btn-next')
    expect(nextBtn.textContent).toContain('Finalizar')
    expect(nextBtn.classList.contains('nbi-btn--success')).toBe(true)
    expect(nextBtn.getAttribute('aria-label')).toBe('Finalizar recorrido')

    overlay.destroy()
  })

  it('debería disparar las callbacks onNext, onPrev y onClose al interactuar con los botones', () => {
    const onNextMock = vi.fn()
    const onPrevMock = vi.fn()
    const onCloseMock = vi.fn()

    const overlay = new TourOverlay(container, {
      step: { id: 's2', title: 'Paso 2', text: 'Texto 2', placement: 'bottom' },
      stepIndex: 1,
      totalSteps: 5,
      onNext: onNextMock,
      onPrev: onPrevMock,
      onClose: onCloseMock
    })
    overlay.mount()

    container.querySelector('#tour-btn-next').click()
    expect(onNextMock).toHaveBeenCalledTimes(1)

    container.querySelector('#tour-btn-prev').click()
    expect(onPrevMock).toHaveBeenCalledTimes(1)

    container.querySelector('#tour-btn-close').click()
    expect(onCloseMock).toHaveBeenCalledTimes(1)

    overlay.destroy()
  })

  it('debería responder a las teclas Escape, ArrowRight y ArrowLeft', () => {
    const onNextMock = vi.fn()
    const onPrevMock = vi.fn()
    const onCloseMock = vi.fn()

    const overlay = new TourOverlay(container, {
      step: { id: 's3', title: 'Paso 3', text: 'Texto 3', placement: 'top' },
      stepIndex: 2,
      totalSteps: 5,
      onNext: onNextMock,
      onPrev: onPrevMock,
      onClose: onCloseMock
    })
    overlay.mount()

    // Escape -> onClose
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onCloseMock).toHaveBeenCalledTimes(1)

    // ArrowRight -> onNext
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(onNextMock).toHaveBeenCalledTimes(1)

    // ArrowLeft -> onPrev
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(onPrevMock).toHaveBeenCalledTimes(1)

    overlay.destroy()
  })

  it('debería ciclar el foco dentro del tooltip con Tab y Shift+Tab (Focus Trap)', () => {
    const overlay = new TourOverlay(container, {
      step: { id: 's2', title: 'Paso 2', text: 'Texto 2', placement: 'bottom' },
      stepIndex: 1,
      totalSteps: 3
    })
    overlay.mount()

    const closeBtn = container.querySelector('#tour-btn-close')
    const prevBtn = container.querySelector('#tour-btn-prev')
    const nextBtn = container.querySelector('#tour-btn-next')

    expect(prevBtn).not.toBeNull()

    // Si el foco está en el último elemento (nextBtn) y se presiona Tab -> va al primero (closeBtn)
    nextBtn.focus()
    expect(document.activeElement).toBe(nextBtn)

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    document.dispatchEvent(tabEvent)
    expect(document.activeElement).toBe(closeBtn)

    // Si el foco está en el primer elemento (closeBtn) y se presiona Shift+Tab -> va al último (nextBtn)
    closeBtn.focus()
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(shiftTabEvent)
    expect(document.activeElement).toBe(nextBtn)

    overlay.destroy()
  })

  it('el método update debería actualizar el contenido sin recrear el DOM', () => {
    const overlay = new TourOverlay(container, {
      step: { id: 's1', title: 'Paso Inicial', text: 'Texto inicial', placement: 'bottom' },
      stepIndex: 0,
      totalSteps: 5
    })
    overlay.mount()

    const initialOverlayRoot = container.querySelector('#tour-overlay-root')

    overlay.update({
      step: { id: 's2', title: 'Nuevo Título', text: 'Nuevo texto actualizado', placement: 'left' },
      stepIndex: 1,
      totalSteps: 5
    })

    expect(container.querySelector('#tour-overlay-root')).toBe(initialOverlayRoot)
    expect(container.querySelector('#tour-step-badge').textContent).toBe('Paso 2 de 5')
    expect(container.querySelector('#tour-step-title').textContent).toBe('Nuevo Título')
    expect(container.querySelector('#tour-step-desc').textContent).toBe('Nuevo texto actualizado')
    expect(container.querySelector('#tour-btn-prev').disabled).toBe(false)

    overlay.destroy()
  })

  it('debería remover el DOM y limpiar listeners al desmontar', () => {
    const onCloseMock = vi.fn()
    const overlay = new TourOverlay(container, {
      step: { id: 's1', title: 'T', text: 'Txt', placement: 'bottom' },
      onClose: onCloseMock
    })
    overlay.mount()

    expect(container.querySelector('#tour-overlay-root')).not.toBeNull()

    overlay.unmount()
    expect(container.querySelector('#tour-overlay-root')).toBeNull()

    // El listener de Escape no debe ejecutarse tras unmount
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onCloseMock).not.toHaveBeenCalled()
  })
})
