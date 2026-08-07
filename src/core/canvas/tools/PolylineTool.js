import { BaseTool } from './BaseTool.js'
import { ShapeFactory } from '../ShapeFactory.js'

/**
 * Herramienta para el trazado interactivo de polilíneas (geometría abierta LineString).
 */
export class PolylineTool extends BaseTool {
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
    this.points.push(pointer)
    this.updatePreview(null)
  }

  onMouseMove(opt) {
    if (this.points.length === 0) return
    const pointer = this.canvasManager.adapter.getScenePoint(opt.e)
    this.updatePreview(pointer)
  }

  updatePreview(currentMousePos) {
    if (this.previewShape) {
      this.canvasManager.adapter.removeObject(this.previewShape)
      this.previewShape = null
    }

    const pointsToRender = [...this.points]
    if (currentMousePos) {
      pointsToRender.push(currentMousePos)
    }

    if (pointsToRender.length >= 2) {
      this.previewShape = ShapeFactory.createPolyline(pointsToRender, {
        color: this.canvasManager.activeColor,
        strokeWidth: this.canvasManager.activeStrokeWidth,
        selectable: false,
        evented: false,
      })
      this.canvasManager.adapter.addObject(this.previewShape)
      this.canvasManager.adapter.requestRenderAll()
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

    if (this.points.length >= 2) {
      const finalShape = ShapeFactory.createPolyline(this.points, {
        color: this.canvasManager.activeColor,
        strokeWidth: this.canvasManager.activeStrokeWidth,
      })

      this.canvasManager.adapter.addObject(finalShape)
      this.canvasManager.finishCreatedObject(finalShape, 'polyline')
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
