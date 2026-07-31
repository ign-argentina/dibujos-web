import { BaseTool } from './BaseTool.js'
import { ShapeFactory } from '../ShapeFactory.js'

/**
 * Herramienta para colocar pins marcadores con tamaño interactivo.
 */
export class PinTool extends BaseTool {
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

    this.previewShape = ShapeFactory.createPin({
      left: this.startX,
      top: this.startY,
      color: this.canvasManager.activeColor,
      scaleX: 0.1,
      scaleY: 0.1,
      selectable: false,
      evented: false,
    })

    this.canvasManager.adapter.addObject(this.previewShape)
    this.canvasManager.adapter.requestRenderAll()
  }

  onMouseMove(opt) {
    if (!this.isDrawing || !this.previewShape) return

    const pointer = this.canvasManager.adapter.getScenePoint(opt.e)
    const deltaX = pointer.x - this.startX
    const deltaY = pointer.y - this.startY
    const dist = Math.hypot(deltaX, deltaY)
    const scale = Math.max(0.2, Math.min(3, dist / 50))

    this.previewShape.set({ left: this.startX, top: this.startY, scaleX: scale, scaleY: scale })
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
        scaleX: 1,
        scaleY: 1,
        originX: 'center',
        originY: 'bottom',
      })
    } else {
      this.previewShape.set({
        left: this.startX,
        top: this.startY,
        originX: 'center',
        originY: 'bottom',
      })
    }

    this.canvasManager.finishCreatedObject(this.previewShape, 'pin')
    this.previewShape = null
  }
}
