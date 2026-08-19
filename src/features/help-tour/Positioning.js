/**
 * Mapeo de fallbacks ordenados para cada posición preferida.
 */
export const DEFAULT_FALLBACK_ORDER = {
  bottom: ['bottom', 'top', 'right', 'left'],
  top: ['top', 'bottom', 'right', 'left'],
  right: ['right', 'left', 'bottom', 'top'],
  left: ['left', 'right', 'bottom', 'top']
}

/**
 * Módulo de utilidades matemáticas puras para calcular el posicionamiento del tooltip
 * respecto al elemento objetivo con detección de colisiones y clamping en el viewport.
 */
export class Positioning {
  /**
   * Calcula la posición (x, y) del tooltip y su flecha indicadora.
   * @param {Object} params
   * @param {{ top: number, left: number, width: number, height: number, right?: number, bottom?: number }} params.targetRect - Bounding rect del elemento objetivo
   * @param {{ width: number, height: number }} params.tooltipSize - Dimensiones del tooltip
   * @param {{ width: number, height: number }} [params.viewport] - Dimensiones del viewport (ancho y alto)
   * @param {'top'|'right'|'bottom'|'left'} [params.placement] - Posición preferida
   * @param {number} [params.gap] - Distancia en px entre el objetivo y el tooltip
   * @param {number} [params.margin] - Margen mínimo respecto a los bordes del viewport
   * @param {string[]} [params.fallbackOrder] - Orden de fallbacks opcional
   * @returns {{ x: number, y: number, placement: string, fits: boolean, arrow: { placement: string, x: number, y: number } }}
   */
  static calculatePosition({
    targetRect,
    tooltipSize,
    viewport = {
      width: typeof window !== 'undefined' ? window.innerWidth : 1024,
      height: typeof window !== 'undefined' ? window.innerHeight : 768
    },
    placement = 'bottom',
    gap = 12,
    margin = 10,
    fallbackOrder = null
  }) {
    if (!targetRect || !tooltipSize) {
      return {
        x: margin,
        y: margin,
        placement: 'bottom',
        fits: false,
        arrow: { placement: 'bottom', x: 0, y: 0 }
      }
    }

    const normTarget = {
      left: targetRect.left ?? targetRect.x ?? 0,
      top: targetRect.top ?? targetRect.y ?? 0,
      width: targetRect.width || 0,
      height: targetRect.height || 0,
      right: targetRect.right ?? ((targetRect.left ?? 0) + (targetRect.width || 0)),
      bottom: targetRect.bottom ?? ((targetRect.top ?? 0) + (targetRect.height || 0))
    }

    const tWidth = tooltipSize.width || 0
    const tHeight = tooltipSize.height || 0
    const vWidth = viewport.width || 1024
    const vHeight = viewport.height || 768

    const order = fallbackOrder || DEFAULT_FALLBACK_ORDER[placement] || DEFAULT_FALLBACK_ORDER.bottom

    let bestResult = null

    for (const candidatePlacement of order) {
      const { x, y, fits } = this._computePlacementCoords({
        target: normTarget,
        tWidth,
        tHeight,
        vWidth,
        vHeight,
        placement: candidatePlacement,
        gap,
        margin
      })

      if (fits) {
        bestResult = { x, y, placement: candidatePlacement, fits: true }
        break
      }

      if (!bestResult) {
        bestResult = { x, y, placement: candidatePlacement, fits: false }
      }
    }

    // Aplicar clamping para garantizar que jamás desborde los límites del viewport
    const clampedX = Math.max(margin, Math.min(bestResult.x, Math.max(margin, vWidth - tWidth - margin)))
    const clampedY = Math.max(margin, Math.min(bestResult.y, Math.max(margin, vHeight - tHeight - margin)))

    // Calcular posición de la flecha respecto al tooltip
    const arrow = this._computeArrowPosition({
      target: normTarget,
      tooltipX: clampedX,
      tooltipY: clampedY,
      tWidth,
      tHeight,
      placement: bestResult.placement
    })

    return {
      x: Math.round(clampedX),
      y: Math.round(clampedY),
      placement: bestResult.placement,
      fits: bestResult.fits,
      arrow
    }
  }

  /**
   * Calcula las coordenadas tentativas y comprueba si encaja dentro del viewport.
   * @private
   */
  static _computePlacementCoords({ target, tWidth, tHeight, vWidth, vHeight, placement, gap, margin }) {
    let x = 0
    let y = 0
    let fits = false

    switch (placement) {
      case 'top':
        x = target.left + (target.width - tWidth) / 2
        y = target.top - tHeight - gap
        fits =
          y >= margin &&
          x >= margin &&
          x + tWidth <= vWidth - margin
        break

      case 'right':
        x = target.right + gap
        y = target.top + (target.height - tHeight) / 2
        fits =
          x + tWidth <= vWidth - margin &&
          y >= margin &&
          y + tHeight <= vHeight - margin
        break

      case 'bottom':
        x = target.left + (target.width - tWidth) / 2
        y = target.bottom + gap
        fits =
          y + tHeight <= vHeight - margin &&
          x >= margin &&
          x + tWidth <= vWidth - margin
        break

      case 'left':
        x = target.left - tWidth - gap
        y = target.top + (target.height - tHeight) / 2
        fits =
          x >= margin &&
          y >= margin &&
          y + tHeight <= vHeight - margin
        break

      default:
        x = target.left + (target.width - tWidth) / 2
        y = target.bottom + gap
        fits = y + tHeight <= vHeight - margin
    }

    return { x, y, fits }
  }

  /**
   * Calcula la posición de la flecha relativa al tooltip con clamping seguro.
   * @private
   */
  static _computeArrowPosition({ target, tooltipX, tooltipY, tWidth, tHeight, placement }) {
    const targetCenterX = target.left + target.width / 2
    const targetCenterY = target.top + target.height / 2

    let arrowX = 0
    let arrowY = 0

    const safeMarginX = Math.min(16, Math.max(0, tWidth / 2))
    const safeMarginY = Math.min(16, Math.max(0, tHeight / 2))

    switch (placement) {
      case 'top':
        arrowX = Math.max(safeMarginX, Math.min(targetCenterX - tooltipX, tWidth - safeMarginX))
        arrowY = tHeight
        break

      case 'bottom':
        arrowX = Math.max(safeMarginX, Math.min(targetCenterX - tooltipX, tWidth - safeMarginX))
        // El triángulo sobresale por el borde superior del tooltip.
        arrowY = -10
        break

      case 'left':
        arrowX = tWidth
        arrowY = Math.max(safeMarginY, Math.min(targetCenterY - tooltipY, tHeight - safeMarginY))
        break

      case 'right':
        // El triángulo sobresale por el borde izquierdo del tooltip.
        arrowX = -10
        arrowY = Math.max(safeMarginY, Math.min(targetCenterY - tooltipY, tHeight - safeMarginY))
        break

      default:
        arrowX = tWidth / 2
        arrowY = 0
    }

    return {
      placement,
      x: Math.round(arrowX),
      y: Math.round(arrowY)
    }
  }
}
