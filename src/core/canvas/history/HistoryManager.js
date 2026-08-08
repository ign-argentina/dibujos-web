
/**
 * Caretaker que gestiona el historial de estados (Mementos) de la aplicación.
 * Permite avanzar y retroceder por los estados capturados.
 */
export class HistoryManager {
  /**
   * @param {Object} canvasManager - Instancia del CanvasManager (Originador).
   * @param {number} maxStates - Límite de estados en memoria (por defecto 50).
   */
  constructor(canvasManager, maxStates = 50) {
    if (!canvasManager) {
      throw new Error('HistoryManager requiere una instancia de CanvasManager')
    }
    this.canvasManager = canvasManager
    this.maxStates = maxStates
    this.history = []
    this.currentIndex = -1
    this.isApplying = false
  }

  /**
   * Captura el estado actual del canvas y lo guarda en el historial.
   */
  capture() {
    if (this.isApplying) return

    const memento = this.canvasManager.createMemento()
    if (!memento || memento.getState() === null) return

    // Evitar registrar estados idénticos consecutivos
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      const currentMemento = this.history[this.currentIndex]
      if (currentMemento.getState() === memento.getState()) {
        return
      }
    }

    // Si estábamos en medio de la pila (después de deshacer), truncar los estados futuros
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }

    this.history.push(memento)
    this.currentIndex++

    // Aplicar límite máximo de estados
    if (this.history.length > this.maxStates) {
      this.history.shift()
      this.currentIndex--
    }

    this.updateUI()
  }

  /**
   * Deshace la última acción retrocediendo un estado en el historial.
   */
  async undo() {
    if (!this.canUndo()) return

    this.isApplying = true
    try {
      this.currentIndex--
      const memento = this.history[this.currentIndex]
      await this.canvasManager.restoreMemento(memento)
    } catch (err) {
      console.error('Error al deshacer la acción:', err)
      this.currentIndex++
    } finally {
      this.isApplying = false
    }

    this.updateUI()
  }

  /**
   * Rehace una acción previamente deshecha avanzando un estado en el historial.
   */
  async redo() {
    if (!this.canRedo()) return

    this.isApplying = true
    try {
      this.currentIndex++
      const memento = this.history[this.currentIndex]
      await this.canvasManager.restoreMemento(memento)
    } catch (err) {
      console.error('Error al rehacer la acción:', err)
      this.currentIndex--
    } finally {
      this.isApplying = false
    }

    this.updateUI()
  }

  /**
   * Limpia todo el historial y restablece los punteros.
   */
  clear() {
    this.history = []
    this.currentIndex = -1
    this.updateUI()
  }

  /**
   * Indica si es posible realizar una operación de Deshacer.
   * @returns {boolean}
   */
  canUndo() {
    return this.currentIndex > 0
  }

  /**
   * Indica si es posible realizar una operación de Rehacer.
   * @returns {boolean}
   */
  canRedo() {
    return this.currentIndex >= 0 && this.currentIndex < this.history.length - 1
  }

  /**
   * Actualiza el estado visual de los botones Undo/Redo en la UI.
   */
  updateUI() {
    const undoBtn = document.getElementById('action-undo')
    const redoBtn = document.getElementById('action-redo')

    const canUndo = this.canUndo()
    const canRedo = this.canRedo()

    if (undoBtn) {
      undoBtn.disabled = !canUndo
      undoBtn.setAttribute('aria-disabled', !canUndo ? 'true' : 'false')
    }

    if (redoBtn) {
      redoBtn.disabled = !canRedo
      redoBtn.setAttribute('aria-disabled', !canRedo ? 'true' : 'false')
    }
  }
}
