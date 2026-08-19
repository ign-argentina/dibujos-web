import { describe, it, expect } from 'vitest'
import { Positioning, DEFAULT_FALLBACK_ORDER } from '../Positioning.js'

describe('Positioning', () => {
  const viewport = { width: 1000, height: 800 }
  const tooltipSize = { width: 200, height: 100 }

  it('debería definir órdenes de fallback para todas las posiciones primarias', () => {
    expect(DEFAULT_FALLBACK_ORDER.bottom).toEqual(['bottom', 'top', 'right', 'left'])
    expect(DEFAULT_FALLBACK_ORDER.top).toEqual(['top', 'bottom', 'right', 'left'])
    expect(DEFAULT_FALLBACK_ORDER.right).toEqual(['right', 'left', 'bottom', 'top'])
    expect(DEFAULT_FALLBACK_ORDER.left).toEqual(['left', 'right', 'bottom', 'top'])
  })

  it('debería calcular correctamente la posición inferior (bottom)', () => {
    const targetRect = { left: 400, top: 200, width: 100, height: 50, right: 500, bottom: 250 }
    const result = Positioning.calculatePosition({
      targetRect,
      tooltipSize,
      viewport,
      placement: 'bottom',
      gap: 10
    })

    expect(result.placement).toBe('bottom')
    expect(result.fits).toBe(true)
    // x = 400 + (100 - 200)/2 = 350
    expect(result.x).toBe(350)
    // y = 250 + 10 = 260
    expect(result.y).toBe(260)
    expect(result.arrow.placement).toBe('bottom')
    expect(result.arrow.y).toBe(0)
  })

  it('debería calcular correctamente la posición superior (top)', () => {
    const targetRect = { left: 400, top: 300, width: 100, height: 50, right: 500, bottom: 350 }
    const result = Positioning.calculatePosition({
      targetRect,
      tooltipSize,
      viewport,
      placement: 'top',
      gap: 10
    })

    expect(result.placement).toBe('top')
    expect(result.fits).toBe(true)
    // x = 400 + (100 - 200)/2 = 350
    expect(result.x).toBe(350)
    // y = 300 - 100 - 10 = 190
    expect(result.y).toBe(190)
    expect(result.arrow.placement).toBe('top')
    expect(result.arrow.y).toBe(100)
  })

  it('debería calcular correctamente la posición derecha (right)', () => {
    const targetRect = { left: 200, top: 300, width: 100, height: 50, right: 300, bottom: 350 }
    const result = Positioning.calculatePosition({
      targetRect,
      tooltipSize,
      viewport,
      placement: 'right',
      gap: 15
    })

    expect(result.placement).toBe('right')
    expect(result.fits).toBe(true)
    // x = 300 + 15 = 315
    expect(result.x).toBe(315)
    // y = 300 + (50 - 100)/2 = 275
    expect(result.y).toBe(275)
    expect(result.arrow.placement).toBe('right')
    expect(result.arrow.x).toBe(0)
  })

  it('debería calcular correctamente la posición izquierda (left)', () => {
    const targetRect = { left: 500, top: 300, width: 100, height: 50, right: 600, bottom: 350 }
    const result = Positioning.calculatePosition({
      targetRect,
      tooltipSize,
      viewport,
      placement: 'left',
      gap: 15
    })

    expect(result.placement).toBe('left')
    expect(result.fits).toBe(true)
    // x = 500 - 200 - 15 = 285
    expect(result.x).toBe(285)
    // y = 300 + (50 - 100)/2 = 275
    expect(result.y).toBe(275)
    expect(result.arrow.placement).toBe('left')
    expect(result.arrow.x).toBe(200)
  })

  it('debería alternar a top si en bottom no hay espacio vertical', () => {
    // Target cerca del borde inferior: bottom = 760 en viewport de 800
    const targetRect = { left: 400, top: 720, width: 100, height: 40, right: 500, bottom: 760 }
    const result = Positioning.calculatePosition({
      targetRect,
      tooltipSize,
      viewport,
      placement: 'bottom',
      gap: 10,
      margin: 10
    })

    expect(result.placement).toBe('top')
    expect(result.fits).toBe(true)
    expect(result.y).toBe(720 - 100 - 10) // 610
  })

  it('debería alternar a bottom si en top no hay espacio vertical', () => {
    // Target cerca del borde superior: top = 20 en viewport de 800
    const targetRect = { left: 400, top: 20, width: 100, height: 40, right: 500, bottom: 60 }
    const result = Positioning.calculatePosition({
      targetRect,
      tooltipSize,
      viewport,
      placement: 'top',
      gap: 10,
      margin: 10
    })

    expect(result.placement).toBe('bottom')
    expect(result.fits).toBe(true)
    expect(result.y).toBe(60 + 10) // 70
  })

  it('debería alternar a left si en right no hay espacio horizontal', () => {
    // Target cerca del borde derecho: right = 950 en viewport de 1000
    const targetRect = { left: 880, top: 300, width: 70, height: 40, right: 950, bottom: 340 }
    const result = Positioning.calculatePosition({
      targetRect,
      tooltipSize,
      viewport,
      placement: 'right',
      gap: 10,
      margin: 10
    })

    expect(result.placement).toBe('left')
    expect(result.fits).toBe(true)
    expect(result.x).toBe(880 - 200 - 10) // 670
  })

  it('debería aplicar clamping estricto para nunca salir del margen del viewport', () => {
    // Target en esquina superior izquierda (0, 0)
    const targetRect = { left: 0, top: 0, width: 50, height: 30, right: 50, bottom: 30 }
    const result = Positioning.calculatePosition({
      targetRect,
      tooltipSize,
      viewport,
      placement: 'bottom',
      margin: 15
    })

    expect(result.x).toBeGreaterThanOrEqual(15)
    expect(result.y).toBeGreaterThanOrEqual(15)
    expect(result.x + tooltipSize.width).toBeLessThanOrEqual(viewport.width - 15)
    expect(result.y + tooltipSize.height).toBeLessThanOrEqual(viewport.height - 15)
  })

  it('debería devolver coordenadas de emergencia seguras si targetRect o tooltipSize son inválidos', () => {
    const result = Positioning.calculatePosition({
      targetRect: null,
      tooltipSize: null,
      margin: 12
    })

    expect(result.x).toBe(12)
    expect(result.y).toBe(12)
    expect(result.fits).toBe(false)
  })
})
