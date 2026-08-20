import { BaseTool } from './BaseTool.js'

/**
 * Herramienta de selección. Permite la manipulación libre de objetos en el lienzo.
 */
export class SelectTool extends BaseTool {
  onActivate() {
    if (!this.canvasManager?.adapter) return
    if (typeof this.canvasManager.adapter.getObjects === 'function') {
      const objects = this.canvasManager.adapter.getObjects()
      if (Array.isArray(objects)) {
        objects.forEach((obj) => {
          if (typeof obj.setCoords === 'function') {
            obj.setCoords()
          }
        })
      }
    }
    this.canvasManager.adapter.requestRenderAll()
  }
}
