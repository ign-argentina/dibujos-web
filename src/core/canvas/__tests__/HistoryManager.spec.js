import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HistoryManager } from '../history/HistoryManager.js'
import { Memento } from '../history/Memento.js'

describe('HistoryManager (Memento & Snapshot Pattern)', () => {
  let mockCanvasManager
  let historyManager

  beforeEach(() => {
    // Mock de CanvasManager y sus métodos de Originador
    mockCanvasManager = {
      serialize: vi.fn(() => '[]'),
      deserialize: vi.fn(),
      createMemento: vi.fn(() => new Memento('[]')),
      restoreMemento: vi.fn(),
    }

    // Mock del DOM para los botones de Undo/Redo
    const mockUndoBtn = document.createElement('button')
    mockUndoBtn.id = 'action-undo'
    const mockRedoBtn = document.createElement('button')
    mockRedoBtn.id = 'action-redo'
    
    document.body.appendChild(mockUndoBtn)
    document.body.appendChild(mockRedoBtn)

    historyManager = new HistoryManager(mockCanvasManager, 3) // Límite de 3 estados para facilitar pruebas
  })

  afterEach(() => {
    // Limpiar el DOM
    const undoBtn = document.getElementById('action-undo')
    const redoBtn = document.getElementById('action-redo')
    if (undoBtn) undoBtn.remove()
    if (redoBtn) redoBtn.remove()
  })

  it('debería inicializarse con punteros vacíos y botones deshabilitados', () => {
    expect(historyManager.history.length).toBe(0)
    expect(historyManager.currentIndex).toBe(-1)
    expect(historyManager.canUndo()).toBe(false)
    expect(historyManager.canRedo()).toBe(false)

    historyManager.updateUI()
    expect(document.getElementById('action-undo').disabled).toBe(true)
    expect(document.getElementById('action-redo').disabled).toBe(true)
  })

  it('debería capturar el primer estado pero no permitir deshacer (currentIndex = 0)', () => {
    mockCanvasManager.createMemento.mockReturnValueOnce(new Memento('["estado_inicial"]'))
    historyManager.capture()

    expect(historyManager.history.length).toBe(1)
    expect(historyManager.currentIndex).toBe(0)
    expect(historyManager.canUndo()).toBe(false) // No se puede deshacer el estado inicial
    expect(historyManager.canRedo()).toBe(false)
  })

  it('debería permitir deshacer después de capturar un segundo estado', () => {
    mockCanvasManager.createMemento
      .mockReturnValueOnce(new Memento('["inicial"]'))
      .mockReturnValueOnce(new Memento('["estado2"]'))

    historyManager.capture() // index 0
    historyManager.capture() // index 1

    expect(historyManager.history.length).toBe(2)
    expect(historyManager.currentIndex).toBe(1)
    expect(historyManager.canUndo()).toBe(true)
    expect(historyManager.canRedo()).toBe(false)

    historyManager.updateUI()
    expect(document.getElementById('action-undo').disabled).toBe(false)
    expect(document.getElementById('action-redo').disabled).toBe(true)
  })

  it('debería evitar capturar mementos consecutivos idénticos', () => {
    mockCanvasManager.createMemento
      .mockReturnValueOnce(new Memento('["estadoA"]'))
      .mockReturnValueOnce(new Memento('["estadoA"]'))

    historyManager.capture()
    historyManager.capture() // Mismo estado

    expect(historyManager.history.length).toBe(1)
    expect(historyManager.currentIndex).toBe(0)
  })

  it('debería aplicar el límite máximo de estados y desplazar la pila', () => {
    mockCanvasManager.createMemento
      .mockReturnValueOnce(new Memento('["1"]'))
      .mockReturnValueOnce(new Memento('["2"]'))
      .mockReturnValueOnce(new Memento('["3"]'))
      .mockReturnValueOnce(new Memento('["4"]')) // supera el maxStates = 3

    historyManager.capture() // 1
    historyManager.capture() // 2
    historyManager.capture() // 3
    historyManager.capture() // 4

    expect(historyManager.history.length).toBe(3)
    expect(historyManager.currentIndex).toBe(2)
    expect(historyManager.history[0].getState()).toBe('["2"]')
    expect(historyManager.history[2].getState()).toBe('["4"]')
  })

  it('debería restaurar el estado anterior al llamar undo', async () => {
    const mem1 = new Memento('["estado1"]')
    const mem2 = new Memento('["estado2"]')

    mockCanvasManager.createMemento
      .mockReturnValueOnce(mem1)
      .mockReturnValueOnce(mem2)

    historyManager.capture() // index 0
    historyManager.capture() // index 1

    await historyManager.undo()

    expect(historyManager.currentIndex).toBe(0)
    expect(mockCanvasManager.restoreMemento).toHaveBeenCalledWith(mem1)
    expect(historyManager.canUndo()).toBe(false)
    expect(historyManager.canRedo()).toBe(true)
  })

  it('debería avanzar de estado al llamar redo', async () => {
    const mem1 = new Memento('["estado1"]')
    const mem2 = new Memento('["estado2"]')

    mockCanvasManager.createMemento
      .mockReturnValueOnce(mem1)
      .mockReturnValueOnce(mem2)

    historyManager.capture() // index 0
    historyManager.capture() // index 1

    await historyManager.undo() // vuelve a index 0
    await historyManager.redo() // vuelve a index 1

    expect(historyManager.currentIndex).toBe(1)
    expect(mockCanvasManager.restoreMemento).toHaveBeenLastCalledWith(mem2)
    expect(historyManager.canUndo()).toBe(true)
    expect(historyManager.canRedo()).toBe(false)
  })

  it('debería truncar los estados futuros si se realiza una acción nueva tras hacer undo', async () => {
    mockCanvasManager.createMemento
      .mockReturnValueOnce(new Memento('["1"]'))
      .mockReturnValueOnce(new Memento('["2"]'))
      .mockReturnValueOnce(new Memento('["3"]'))

    historyManager.capture() // 1 (index 0)
    historyManager.capture() // 2 (index 1)
    historyManager.capture() // 3 (index 2)

    await historyManager.undo() // index 1
    
    // Captura una nueva acción
    mockCanvasManager.createMemento.mockReturnValueOnce(new Memento('["4"]'))
    historyManager.capture() // index 2

    expect(historyManager.history.length).toBe(3)
    expect(historyManager.currentIndex).toBe(2)
    expect(historyManager.history[2].getState()).toBe('["4"]')
    expect(historyManager.canRedo()).toBe(false)
  })

  it('debería limpiar el historial completamente al llamar clear()', () => {
    mockCanvasManager.createMemento.mockReturnValue(new Memento('["1"]'))
    historyManager.capture()
    historyManager.capture()

    historyManager.clear()

    expect(historyManager.history.length).toBe(0)
    expect(historyManager.currentIndex).toBe(-1)
  })
})
