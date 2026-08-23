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
    const scale = Math.max(0.6, Math.min(10, dist / 25))

    this.previewShape.set({ left: this.startX, top: this.startY, scaleX: scale, scaleY: scale })
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
        scaleX: 3,
        scaleY: 3,
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

    if (typeof this.previewShape.setCoords === 'function') {
      this.previewShape.setCoords()
    }

    this.canvasManager.finishCreatedObject(this.previewShape, 'pin')
    this.previewShape = null
  }
}
