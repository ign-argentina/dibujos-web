import { BaseTool } from './BaseTool.js'

/**
 * Herramienta de pincel. Habilita el dibujo a mano alzada.
 */
export class BrushTool extends BaseTool {
  onActivate() {
    this.canvasManager.adapter.setDrawingMode(true)
    this.canvasManager.configureDrawingBrush()
    this.canvasManager.adapter.setDefaultCursor('default')
    this.canvasManager.adapter.setSelectionEnabled(false)
  }

  onDeactivate() {
    this.canvasManager.adapter.setDrawingMode(false)
  }
}
