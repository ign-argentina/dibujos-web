import { Command } from './Command.js'

export class SendToBackCommand extends Command {
  constructor(canvasManager, targetObject = null) {
    super()
    this.canvasManager = canvasManager
    this.targetObject = targetObject || canvasManager.adapter.getActiveObject()
    this.previousIndex = -1
  }

  execute() {
    if (!this.targetObject || this.targetObject === this.canvasManager.currentMapImage) return
    
    const objects = this.canvasManager.adapter.getObjects()
    this.previousIndex = objects.indexOf(this.targetObject)

    this.canvasManager.adapter.sendObjectToBack(this.targetObject)
    if (this.canvasManager.currentMapImage) {
      this.canvasManager.adapter.sendObjectToBack(this.canvasManager.currentMapImage)
    }
    this.canvasManager.adapter.requestRenderAll()
    this.canvasManager.adapter.fire('object:modified')
  }

  undo() {
    if (!this.targetObject || this.previousIndex === -1) return
    
    this.canvasManager.adapter.moveObjectTo(this.targetObject, this.previousIndex)
    this.canvasManager.adapter.requestRenderAll()
    this.canvasManager.adapter.fire('object:modified')
  }
}
