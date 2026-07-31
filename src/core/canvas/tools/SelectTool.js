import { BaseTool } from './BaseTool.js'

/**
 * Herramienta de selección. Permite la manipulación libre de objetos en el lienzo.
 */
export class SelectTool extends BaseTool {
  onActivate() {
    this.canvasManager.adapter.setDrawingMode(false)
    this.canvasManager.adapter.setSelectionEnabled(true)
    this.canvasManager.adapter.setDefaultCursor('default')
  }
}
