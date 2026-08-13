import { BaseTool } from './BaseTool.js'
import { ShapeFactory } from '../ShapeFactory.js'

/**
 * Herramienta para el trazado interactivo de polígonos libres (geometría cerrada Polygon).
 */
export class PolygonTool extends BaseTool {
  constructor(canvasManager) {
    super(canvasManager)
    this.points = []
    this.previewShape = null
  }

  onActivate() {
    this.points = []
    this.previewShape = null
    this.canvasManager.adapter.setDrawingMode(false)
    this.canvasManager.adapter.setSelectionEnabled(false)
    this.canvasManager.adapter.setDefaultCursor('crosshair')
  }

  onDeactivate() {
    this.cleanup()
  }

  cleanup() {
    if (this.previewShape) {
      this.canvasManager.adapter.removeObject(this.previewShape)
      this.previewShape = null
    }
    this.points = []
    this.canvasManager.adapter.requestRenderAll()
  }

  onMouseDown(opt) {
    const pointer = this.canvasManager.adapter.getScenePoint(opt.e)

    // Si ya tenemos suficientes puntos, verificar si el clic es cerca del primer punto
    // para cerrar el polígono y finalizar
    if (this.points.length >= 3) {
      const firstPoint = this.points[0]
      const dist = Math.hypot(pointer.x - firstPoint.x, pointer.y - firstPoint.y)
      if (dist < 12) { // Tolerancia de 12px para cerrar el polígono
        this.finishDrawing()
        return
      }
    }

    this.points.push(pointer)
    this.updatePreview(null)
  }

  onMouseMove(opt) {
    if (this.points.length === 0) return
    const pointer = this.canvasManager.adapter.getScenePoint(opt.e)
    this.updatePreview(pointer)
  }

  updatePreview(currentMousePos) {
    const pointsToRender = [...this.points]
    if (currentMousePos) {
      pointsToRender.push(currentMousePos)
    }
    if (pointsToRender.length >= 2) {
      if (this.previewShape) {
        this.previewShape.points = pointsToRender
        this.previewShape.dirty = true
        if (typeof this.previewShape.setBoundingBox === 'function') {
          this.previewShape.setBoundingBox(true)
        }
        if (typeof this.previewShape.setCoords === 'function') {
          this.previewShape.setCoords()
        }
      } else {
        this.previewShape = ShapeFactory.createPolygon(pointsToRender, {
          color: this.canvasManager.activeColor,
          strokeWidth: this.canvasManager.activeStrokeWidth,
          selectable: false,
          evented: false,
        })
        this.canvasManager.adapter.addObject(this.previewShape)
      }
      this.canvasManager.adapter.requestRenderAll()
    } else {
      if (this.previewShape) {
        this.canvasManager.adapter.removeObject(this.previewShape)
        this.previewShape = null
        this.canvasManager.adapter.requestRenderAll()
      }
    }
  }

  onMouseDblClick(_opt) {
    // Al hacer doble clic, se suele añadir un punto extra duplicado.
    // Quitamos el último punto antes de finalizar.
    if (this.points.length > 0) {
      this.points.pop()
    }
    this.finishDrawing()
  }

  onKeyDown(e) {
    if (e.key === 'Enter') {
      this.finishDrawing()
      return true
    }
    if (e.key === 'Escape') {
      this.cleanup()
      this.canvasManager.setTool('select')
      if (typeof this.canvasManager.onToolChange === 'function') {
        this.canvasManager.onToolChange('select')
      }
      return true
    }
    return false
  }

  finishDrawing() {
    // Filtrar puntos duplicados consecutivos
    const uniquePoints = []
    for (const pt of this.points) {
      if (uniquePoints.length === 0) {
        uniquePoints.push(pt)
      } else {
        const lastPt = uniquePoints[uniquePoints.length - 1]
        const dist = Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y)
        if (dist > 1) { // Tolerancia de 1 píxel para evitar duplicaciones por dblclick
          uniquePoints.push(pt)
        }
      }
    }
    this.points = uniquePoints

    if (this.previewShape) {
      this.canvasManager.adapter.removeObject(this.previewShape)
      this.previewShape = null
    }

    // Necesitamos al menos 3 puntos para un polígono válido
    if (this.points.length >= 3) {
      const finalShape = ShapeFactory.createPolygon(this.points, {
        color: this.canvasManager.activeColor,
        strokeWidth: this.canvasManager.activeStrokeWidth,
      })

      this.canvasManager.adapter.addObject(finalShape)
      this.canvasManager.finishCreatedObject(finalShape, 'polygon')
    } else {
      this.cleanup()
      this.canvasManager.setTool('select')
      if (typeof this.canvasManager.onToolChange === 'function') {
        this.canvasManager.onToolChange('select')
      }
    }
    this.points = []
  }
}
