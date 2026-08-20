import { BaseTool } from './BaseTool.js'
import { ShapeFactory } from '../ShapeFactory.js'

/**
 * Herramienta para el trazado interactivo de círculos.
 */
export class CircleTool extends BaseTool {
  constructor(canvasManager) {
    super(canvasManager)
    this.startX = 0
    this.startY = 0
    this.isDrawing = false
    this.previewShape = null
  }

  onActivate() {}

  onDeactivate() {
    this.cleanup()
  }

  cleanup() {
    if (this.previewShape) {
      this.canvasManager.adapter.removeObject(this.previewShape)
      this.previewShape = null
      this.canvasManager.adapter.requestRenderAll()
    }
    this.isDrawing = false
  }

  onMouseDown(opt) {
    const pointer = this.canvasManager.adapter.getScenePoint(opt.e)
    this.startX = pointer.x
    this.startY = pointer.y
    this.isDrawing = true

    this.previewShape = ShapeFactory.createCircle({
      left: this.startX,
      top: this.startY,
      radius: 1,
      color: this.canvasManager.activeColor,
      originX: 'left',
      originY: 'top',
      selectable: false,
      evented: false,
    })

    this.canvasManager.adapter.addObject(this.previewShape)
    this.canvasManager.adapter.requestRenderAll()
  }

  onMouseMove(opt) {
    if (!this.isDrawing || !this.previewShape) return

    const pointer = this.canvasManager.adapter.getScenePoint(opt.e)
    const currentX = pointer.x
    const currentY = pointer.y

    const diameter = Math.max(Math.abs(currentX - this.startX), Math.abs(currentY - this.startY))
    const radius = Math.max(diameter / 2, 1)
    const left = Math.min(this.startX, currentX)
    const top = Math.min(this.startY, currentY)

    this.previewShape.set({ left, top, radius })
    if (typeof this.previewShape.setCoords === 'function') {
      this.previewShape.setCoords()
    }
    this.canvasManager.adapter.requestRenderAll()
  }

  onMouseUp(opt) {
    if (!this.isDrawing || !this.previewShape) return
    this.isDrawing = false

    const pointer = this.canvasManager.adapter.getScenePoint(opt.e)
    const dist = Math.hypot(pointer.x - this.startX, pointer.y - this.startY)

    if (dist < 5) {
      this.previewShape.set({
        left: this.startX,
        top: this.startY,
        radius: 60,
        originX: 'center',
        originY: 'center',
      })
    } else {
      this.previewShape.set({
        originX: 'left',
        originY: 'top',
      })
    }

    if (typeof this.previewShape.setCoords === 'function') {
      this.previewShape.setCoords()
    }

    this.canvasManager.finishCreatedObject(this.previewShape, 'circle')
    this.previewShape = null
  }
}
