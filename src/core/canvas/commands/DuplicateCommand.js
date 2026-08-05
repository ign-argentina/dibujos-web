import { Command } from './Command.js'

export class DuplicateCommand extends Command {
  constructor(canvasManager, targetObject = null) {
    super()
    this.canvasManager = canvasManager
    this.targetObject = targetObject || canvasManager.adapter.getActiveObject()
    this.clonedObject = null
  }

  async execute() {
    if (!this.targetObject || this.targetObject === this.canvasManager.currentMapImage) return

    // Si ya se clonó (caso de Rehacer), agregarlo directamente al lienzo
    if (this.clonedObject) {
      if (this.clonedObject.type === 'activeSelection') {
        this.clonedObject.forEachObject((obj) => {
          this.canvasManager.adapter.addObject(obj)
        })
      } else {
        this.canvasManager.adapter.addObject(this.clonedObject)
      }
      this.canvasManager.adapter.setActiveObject(this.clonedObject)
      this.canvasManager.adapter.requestRenderAll()
      this.canvasManager.adapter.fire('object:modified')
      return
    }

    // Primera ejecución: clonación del objeto seleccionado
    try {
      const cloned = await this.targetObject.clone()
      cloned.set({
        left: this.targetObject.left + 20,
        top: this.targetObject.top + 20,
        evented: true,
        selectable: true,
      })

      if (cloned.type === 'activeSelection') {
        cloned.canvas = this.canvasManager.canvas
        cloned.forEachObject((obj) => {
          this.canvasManager.adapter.addObject(obj)
        })
        cloned.setCoordinates()
      } else {
        this.canvasManager.adapter.addObject(cloned)
      }

      this.clonedObject = cloned
      this.canvasManager.adapter.setActiveObject(cloned)
      this.canvasManager.adapter.requestRenderAll()
      this.canvasManager.adapter.fire('object:modified')
    } catch (err) {
      console.error('DuplicateCommand: Error clonando objeto:', err)
    }
  }

  undo() {
    if (!this.clonedObject) return

    if (this.clonedObject.type === 'activeSelection') {
      this.clonedObject.forEachObject((obj) => {
        this.canvasManager.adapter.removeObject(obj)
      })
    } else {
      this.canvasManager.adapter.removeObject(this.clonedObject)
    }

    this.canvasManager.adapter.discardActiveObject()
    this.canvasManager.adapter.requestRenderAll()
    this.canvasManager.adapter.fire('object:modified')
  }
}
