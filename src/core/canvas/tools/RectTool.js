import { BaseTool } from './BaseTool.js'
import { ShapeFactory } from '../ShapeFactory.js'

/**
 * Herramienta para el trazado interactivo de rectángulos.
 */
export class RectTool extends BaseTool {
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

    this.previewShape = ShapeFactory.createRect({
      left: this.startX,
      top: this.startY,
      width: 1,
      height: 1,
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

    const left = Math.min(this.startX, currentX)
    const top = Math.min(this.startY, currentY)
    const width = Math.max(Math.abs(currentX - this.startX), 1)
    const height = Math.max(Math.abs(currentY - this.startY), 1)

    this.previewShape.set({ left, top, width, height })
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
        width: 140,
        height: 100,
        originX: 'center',
        originY: 'center',
      })
    } else {
      this.previewShape.set({
        originX: 'left',
        originY: 'top',
      })
    }

    this.canvasManager.finishCreatedObject(this.previewShape, 'rect')
    this.previewShape = null
  }
}
