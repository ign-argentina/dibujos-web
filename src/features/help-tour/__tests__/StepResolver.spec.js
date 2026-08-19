import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { StepResolver, DEFAULT_FALLBACK_MAP } from '../StepResolver.js'

describe('StepResolver', () => {
  let root

  beforeEach(() => {
    root = document.createElement('div')
    document.body.appendChild(root)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('debería resolver exitosamente un elemento con dimensiones positivas', () => {
    const el = document.createElement('div')
    el.setAttribute('data-tour', 'navbar')
    el.getBoundingClientRect = () => ({
      left: 10,
      top: 10,
      width: 200,
      height: 60,
      right: 210,
      bottom: 70
    })
    root.appendChild(el)

    const result = StepResolver.resolveTarget('[data-tour="navbar"]', { root })

    expect(result.found).toBe(true)
    expect(result.status).toBe('resolved')
    expect(result.element).toBe(el)
    expect(result.rect.width).toBe(200)
    expect(StepResolver.shouldSkipStep(result)).toBe(false)
  })

  it('debería resolver mediante selector fallback si el target data-tour primario no existe', () => {
    const el = document.createElement('div')
    el.id = 'navbar'
    el.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 300,
      height: 50,
      right: 300,
      bottom: 50
    })
    root.appendChild(el)

    const result = StepResolver.resolveTarget('[data-tour="navbar"]', {
      root,
      fallbackMap: DEFAULT_FALLBACK_MAP
    })

    expect(result.found).toBe(true)
    expect(result.status).toBe('resolved')
    expect(result.element).toBe(el)
  })

  it('debería usar el contenedor del canvas si la superficie interna tiene altura cero', () => {
    const canvas = document.createElement('canvas')
    canvas.className = 'fabric-canvas'
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 900,
      height: 0,
      right: 900,
      bottom: 0
    })

    const canvasRoot = document.createElement('div')
    canvasRoot.className = 'canvas-root'
    canvasRoot.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 900,
      height: 600,
      right: 900,
      bottom: 600
    })

    root.append(canvas, canvasRoot)

    const result = StepResolver.resolveTarget('[data-tour="canvas-area"]', { root })

    expect(result.found).toBe(true)
    expect(result.element).toBe(canvasRoot)
    expect(result.rect.height).toBe(600)
  })

  it('debería reportar not_found si el elemento no existe en el DOM', () => {
    const result = StepResolver.resolveTarget('[data-tour="non-existent"]', { root })

    expect(result.found).toBe(false)
    expect(result.status).toBe('not_found')
    expect(result.element).toBeNull()
    expect(StepResolver.shouldSkipStep(result)).toBe(true)
  })

  it('debería reportar zero_dimension si el elemento existe pero mide 0x0', () => {
    const el = document.createElement('div')
    el.setAttribute('data-tour', 'hidden-widget')
    el.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      right: 0,
      bottom: 0
    })
    root.appendChild(el)

    const result = StepResolver.resolveTarget('[data-tour="hidden-widget"]', { root })

    expect(result.found).toBe(false)
    expect(result.status).toBe('zero_dimension')
    expect(result.element).toBe(el)
    expect(StepResolver.shouldSkipStep(result)).toBe(true)
  })

  it('resolveStep no debe mutar el objeto original del paso', () => {
    const originalStep = {
      id: 'step-1',
      target: '[data-tour="navbar"]',
      title: 'Título',
      text: 'Texto',
      placement: 'bottom'
    }

    const resolved = StepResolver.resolveStep(originalStep, { root })

    expect(resolved).not.toBe(originalStep)
    expect(originalStep.resolution).toBeUndefined()
    expect(resolved.resolution).toBeDefined()
  })

  it('resolveTour debe procesar todos los pasos sin mutar el objeto original del tour', () => {
    const tour = {
      id: 'sample',
      version: 1,
      title: 'Sample Tour',
      steps: [
        { id: 's1', target: '[data-tour="t1"]', title: 'T1', text: 'Txt1', placement: 'top' },
        { id: 's2', target: '[data-tour="t2"]', title: 'T2', text: 'Txt2', placement: 'bottom' }
      ]
    }

    const resolvedTour = StepResolver.resolveTour(tour, { root })

    expect(resolvedTour).not.toBe(tour)
    expect(resolvedTour.steps).not.toBe(tour.steps)
    expect(resolvedTour.steps.length).toBe(2)
    expect(tour.steps[0].resolution).toBeUndefined()
    expect(resolvedTour.steps[0].resolution).toBeDefined()
  })
})
