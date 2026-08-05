/**
 * Gestor del historial de comandos para soportar Deshacer (Undo) y Rehacer (Redo).
 */
export class CommandHistory {
  constructor() {
    this.undoStack = []
    this.redoStack = []
  }

  /**
   * Ejecuta un comando y lo añade al stack de deshacer.
   * @param {Command} command
   */
  execute(command) {
    command.execute()
    this.undoStack.push(command)
    this.redoStack = [] // Limpiar el historial de rehacer
  }

  /**
   * Deshace la última acción ejecutada.
   */
  undo() {
    if (this.undoStack.length === 0) return
    const command = this.undoStack.pop()
    command.undo()
    this.redoStack.push(command)
  }

  /**
   * Rehace la última acción deshecha.
   */
  redo() {
    if (this.redoStack.length === 0) return
    const command = this.redoStack.pop()
    command.execute()
    this.undoStack.push(command)
  }

  /**
   * Limpia ambos stacks.
   */
  clear() {
    this.undoStack = []
    this.redoStack = []
  }
}
