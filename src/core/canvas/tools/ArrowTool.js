import { BaseTool } from './BaseTool.js'
import { ShapeFactory } from '../ShapeFactory.js'

/**
 * Herramienta para el trazado interactivo de flechas de flujo.
 */
export class ArrowTool extends BaseTool {
  constructor(canvasManager) {
    super(canvasManager)
    this.startX = 0
    this.startY = 0
    this.isDrawing = false
    this.previewShape = null
  }

  onActivate() {
    this.canvasManager.adapter.setDrawingMode(false)
    this.canvasManager.adapter.setSelectionEnabled(false)
    this.canvasManager.adapter.setDefaultCursor('crosshair')
  }

  onMouseDown(opt) {
    const pointer = this.canvasManager.adapter.getScenePoint(opt.e)
    this.startX = pointer.x
    this.startY = pointer.y
    this.isDrawing = true

    this.previewShape = ShapeFactory.createArrow(
      this.canvasManager.createArrowPath(
        this.startX,
        this.startY,
        this.startX + 1,
        this.startY + 1
      ),
      {
        color: this.canvasManager.activeColor,
        strokeWidth: this.canvasManager.activeStrokeWidth,
        selectable: false,
        evented: false,
      }
    )

    this.canvasManager.adapter.addObject(this.previewShape)
    this.canvasManager.adapter.requestRenderAll()
  }

  onMouseMove(opt) {
    if (!this.isDrawing || !this.previewShape) return

    const pointer = this.canvasManager.adapter.getScenePoint(opt.e)
    const currentX = pointer.x
    const currentY = pointer.y

    this.canvasManager.adapter.removeObject(this.previewShape)
    this.previewShape = ShapeFactory.createArrow(
      this.canvasManager.createArrowPath(this.startX, this.startY, currentX, currentY),
      {
        color: this.canvasManager.activeColor,
        strokeWidth: this.canvasManager.activeStrokeWidth,
        selectable: false,
        evented: false,
      }
    )
    this.canvasManager.adapter.addObject(this.previewShape)
    this.canvasManager.adapter.requestRenderAll()
  }

  onMouseUp(opt) {
    if (!this.isDrawing || !this.previewShape) return
    this.isDrawing = false

    const pointer = this.canvasManager.adapter.getScenePoint(opt.e)
    const dist = Math.hypot(pointer.x - this.startX, pointer.y - this.startY)

    if (dist < 5) {
      this.canvasManager.adapter.removeObject(this.previewShape)
      const defaultArrow = ShapeFactory.createArrow(
        this.canvasManager.createArrowPath(
          this.startX - 50,
          this.startY,
          this.startX + 50,
          this.startY
        ),
        {
          color: this.canvasManager.activeColor,
          strokeWidth: this.canvasManager.activeStrokeWidth,
        }
      )
      this.canvasManager.adapter.addObject(defaultArrow)
      this.canvasManager.finishCreatedObject(defaultArrow, 'arrow')
    } else {
      this.canvasManager.finishCreatedObject(this.previewShape, 'arrow')
    }

    this.previewShape = null
  }
}
