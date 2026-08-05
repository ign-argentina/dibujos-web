import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CommandHistory } from '../commands/CommandHistory.js'
import { DeleteCommand } from '../commands/DeleteCommand.js'
import { BringToFrontCommand } from '../commands/BringToFrontCommand.js'
import { SendToBackCommand } from '../commands/SendToBackCommand.js'
import { DuplicateCommand } from '../commands/DuplicateCommand.js'
import { ClearCommand } from '../commands/ClearCommand.js'

describe('Pattern of Commands and History', () => {
  let mockCanvasManager
  let mockAdapter
  let history

  beforeEach(() => {
    mockAdapter = {
      getObjects: vi.fn(() => []),
      addObject: vi.fn(),
      removeObject: vi.fn(),
      insertAt: vi.fn(),
      getActiveObject: vi.fn(),
      setActiveObject: vi.fn(),
      discardActiveObject: vi.fn(),
      bringObjectToFront: vi.fn(),
      sendObjectToBack: vi.fn(),
      moveObjectTo: vi.fn(),
      requestRenderAll: vi.fn(),
      fire: vi.fn(),
    }

    mockCanvasManager = {
      canvas: {},
      adapter: mockAdapter,
      currentMapImage: { isMapBase: true },
    }

    history = new CommandHistory()
  })

  describe('CommandHistory', () => {
    it('debería ejecutar un comando e insertarlo en el stack de deshacer', () => {
      const mockCommand = { execute: vi.fn(), undo: vi.fn() }
      history.execute(mockCommand)
      expect(mockCommand.execute).toHaveBeenCalledTimes(1)
      expect(history.undoStack.length).toBe(1)
      expect(history.redoStack.length).toBe(0)
    })

    it('debería revertir un comando al llamar undo', () => {
      const mockCommand = { execute: vi.fn(), undo: vi.fn() }
      history.execute(mockCommand)
      history.undo()
      expect(mockCommand.undo).toHaveBeenCalledTimes(1)
      expect(history.undoStack.length).toBe(0)
      expect(history.redoStack.length).toBe(1)
    })

    it('debería volver a ejecutar al llamar redo', () => {
      const mockCommand = { execute: vi.fn(), undo: vi.fn() }
      history.execute(mockCommand)
      history.undo()
      history.redo()
      expect(mockCommand.execute).toHaveBeenCalledTimes(2)
      expect(history.undoStack.length).toBe(1)
      expect(history.redoStack.length).toBe(0)
    })
  })

  describe('DeleteCommand', () => {
    it('debería borrar el objeto al ejecutar y restaurarlo en el z-index correcto al deshacer', () => {
      const targetObj = { type: 'rect' }
      mockAdapter.getObjects.mockReturnValue([{ isMapBase: true }, { type: 'circle' }, targetObj])
      mockAdapter.getActiveObject.mockReturnValue(targetObj)

      const cmd = new DeleteCommand(mockCanvasManager, targetObj)
      history.execute(cmd)

      expect(mockAdapter.removeObject).toHaveBeenCalledWith(targetObj)
      expect(cmd.index).toBe(2)

      history.undo()
      expect(mockAdapter.insertAt).toHaveBeenCalledWith(2, targetObj)
    })
  })

  describe('BringToFrontCommand', () => {
    it('debería traer al frente y restaurar al deshacer', () => {
      const targetObj = { type: 'rect' }
      mockAdapter.getObjects.mockReturnValue([{ isMapBase: true }, targetObj, { type: 'circle' }])

      const cmd = new BringToFrontCommand(mockCanvasManager, targetObj)
      history.execute(cmd)

      expect(mockAdapter.bringObjectToFront).toHaveBeenCalledWith(targetObj)
      expect(cmd.previousIndex).toBe(1)

      history.undo()
      expect(mockAdapter.moveObjectTo).toHaveBeenCalledWith(targetObj, 1)
    })
  })

  describe('SendToBackCommand', () => {
    it('debería enviar al fondo y restaurar al deshacer', () => {
      const targetObj = { type: 'rect' }
      mockAdapter.getObjects.mockReturnValue([{ isMapBase: true }, { type: 'circle' }, targetObj])

      const cmd = new SendToBackCommand(mockCanvasManager, targetObj)
      history.execute(cmd)

      expect(mockAdapter.sendObjectToBack).toHaveBeenCalledWith(targetObj)
      expect(cmd.previousIndex).toBe(2)

      history.undo()
      expect(mockAdapter.moveObjectTo).toHaveBeenCalledWith(targetObj, 2)
    })
  })

  describe('DuplicateCommand', () => {
    it('debería clonar el objeto, agregarlo al canvas y removerlo al deshacer', async () => {
      const targetObj = {
        type: 'rect',
        left: 10,
        top: 20,
        clone: vi.fn().mockResolvedValue({
          set: vi.fn(),
          type: 'rect',
        }),
      }

      const cmd = new DuplicateCommand(mockCanvasManager, targetObj)
      await cmd.execute()

      expect(targetObj.clone).toHaveBeenCalled()
      expect(mockAdapter.addObject).toHaveBeenCalled()

      cmd.undo()
      expect(mockAdapter.removeObject).toHaveBeenCalled()
    })
  })

  describe('ClearCommand', () => {
    it('debería borrar todo a excepción del mapa base y restaurar en orden al deshacer', () => {
      const obj1 = { type: 'rect' }
      const obj2 = { type: 'circle' }
      mockAdapter.getObjects.mockReturnValue([mockCanvasManager.currentMapImage, obj1, obj2])

      const cmd = new ClearCommand(mockCanvasManager)
      history.execute(cmd)

      expect(mockAdapter.removeObject).toHaveBeenCalledWith(obj1)
      expect(mockAdapter.removeObject).toHaveBeenCalledWith(obj2)
      expect(cmd.removedObjects.length).toBe(2)

      history.undo()
      expect(mockAdapter.insertAt).toHaveBeenCalledWith(1, obj1)
      expect(mockAdapter.insertAt).toHaveBeenCalledWith(2, obj2)
    })
  })
})
