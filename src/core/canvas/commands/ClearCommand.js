import { Command } from './Command.js'

export class ClearCommand extends Command {
  constructor(canvasManager) {
    super()
    this.canvasManager = canvasManager
    this.removedObjects = [] // Almacenará objetos e índices { object, index }
  }

  execute() {
    const objects = this.canvasManager.adapter.getObjects()
    this.removedObjects = []

    // Almacenar referencias e índices de los objetos a eliminar
    objects.forEach((obj, index) => {
      if (obj !== this.canvasManager.currentMapImage && obj.isMapBase !== true) {
        this.removedObjects.push({ object: obj, index })
      }
    })

    // Remover del canvas
    this.removedObjects.forEach(({ object }) => {
      this.canvasManager.adapter.removeObject(object)
    })

    this.canvasManager.adapter.discardActiveObject()
    this.canvasManager.adapter.requestRenderAll()
    this.canvasManager.adapter.fire('object:modified')
  }

  undo() {
    if (this.removedObjects.length === 0) return

    // Re-insertar en sus posiciones z-index originales ordenados ascendentemente
    const sorted = [...this.removedObjects].sort((a, b) => a.index - b.index)
    sorted.forEach(({ object, index }) => {
      this.canvasManager.adapter.insertAt(index, object)
    })

    this.canvasManager.adapter.requestRenderAll()
    this.canvasManager.adapter.fire('object:modified')
  }
}
