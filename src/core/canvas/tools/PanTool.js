import { BaseTool } from './BaseTool.js'

/**
 * Herramienta de desplazamiento de mapa (Pan). Permite mover el mapa con el clic izquierdo.
 */
export class PanTool extends BaseTool {
  onActivate() {
    this.canvasManager.adapter.setDrawingMode(false)
    this.canvasManager.adapter.setSelectionEnabled(false)
    this.canvasManager.adapter.setSkipTargetFind(true)
    this.canvasManager.adapter.discardActiveObject()
    this.canvasManager.adapter.setDefaultCursor('grab')
  }

  onDeactivate() {
    this.canvasManager.adapter.setSkipTargetFind(false)
  }
}
