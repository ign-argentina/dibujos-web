import { Command } from './Command.js'

export class DeleteCommand extends Command {
  constructor(canvasManager, targetObject = null) {
    super()
    this.canvasManager = canvasManager
    this.targetObject = targetObject || canvasManager.adapter.getActiveObject()
    this.index = -1
  }

  execute() {
    if (!this.targetObject || this.targetObject === this.canvasManager.currentMapImage) return
    
    // Obtener y almacenar el índice Z antes de remover el objeto
    const objects = this.canvasManager.adapter.getObjects()
    this.index = objects.indexOf(this.targetObject)

    this.canvasManager.adapter.removeObject(this.targetObject)
    this.canvasManager.adapter.discardActiveObject()
    this.canvasManager.adapter.requestRenderAll()
    this.canvasManager.adapter.fire('object:modified')
  }

  undo() {
    if (!this.targetObject || this.index === -1) return

    // Insertar nuevamente el objeto en su posición original de z-index
    this.canvasManager.adapter.insertAt(this.index, this.targetObject)
    this.canvasManager.adapter.setActiveObject(this.targetObject)
    this.canvasManager.adapter.requestRenderAll()
    this.canvasManager.adapter.fire('object:modified')
  }
}
