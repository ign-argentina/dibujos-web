import { Component } from '../Component.js'
import { ClearConfirmModal } from '../clear-confirm-modal/ClearConfirmModal.js'

/**
 * Componente que gestiona la barra de herramientas de dibujo y acciones globales del lienzo.
 */
export class Toolbar extends Component {
  constructor(container, props) {
    super(container, props)
    this.canvasManager = props.canvasManager
    this.toolButtons = {}
  }

  render() {
    this.toolButtons = {
      pan: document.getElementById('tool-pan'),
      select: document.getElementById('tool-select'),
      brush: document.getElementById('tool-brush'),
      rect: document.getElementById('tool-rect'),
      circle: document.getElementById('tool-circle'),
      arrow: document.getElementById('tool-arrow'),
      polyline: document.getElementById('tool-polyline'),
      polygon: document.getElementById('tool-polygon'),
      text: document.getElementById('tool-text'),
      pin: document.getElementById('tool-pin'),
    }

    this.deleteBtn = document.getElementById('tool-delete')
    this.clearBtn = document.getElementById('tool-clear')
    this.undoBtn = document.getElementById('action-undo')
    this.redoBtn = document.getElementById('action-redo')
    this.zoomInBtn = document.getElementById('action-zoom-in')
    this.zoomOutBtn = document.getElementById('action-zoom-out')
    this.zoomHomeBtn = document.getElementById('action-zoom-home')

    const modalEl = document.getElementById('clear-confirm-modal')
    if (modalEl) {
      this.clearConfirmModal = new ClearConfirmModal(modalEl, () => {
        this.canvasManager.clearCanvas()
      })
    }

    this.updateActiveToolUI(this.canvasManager.activeTool)
  }

  bindEvents() {
    // Registrar manejadores para selección de cada herramienta
    Object.entries(this.toolButtons).forEach(([toolName, btn]) => {
      if (btn) {
        this.addEvent(btn, 'click', () => {
          this.canvasManager.setTool(toolName)
          this.updateActiveToolUI(toolName)
        })
      }
    })

    if (this.deleteBtn) {
      this.addEvent(this.deleteBtn, 'click', () => {
        this.canvasManager.deleteSelected()
      })
    }

    if (this.clearBtn) {
      this.addEvent(this.clearBtn, 'click', () => {
        if (this.clearConfirmModal) {
          this.clearConfirmModal.open()
        } else {
          this.canvasManager.clearCanvas()
        }
      })
    }

    if (this.undoBtn) {
      this.addEvent(this.undoBtn, 'click', () => {
        this.canvasManager.undo()
      })
    }

    if (this.redoBtn) {
      this.addEvent(this.redoBtn, 'click', () => {
        this.canvasManager.redo()
      })
    }

    if (this.zoomInBtn) {
      this.addEvent(this.zoomInBtn, 'click', () => {
        this.canvasManager.zoomIn()
      })
    }

    if (this.zoomOutBtn) {
      this.addEvent(this.zoomOutBtn, 'click', () => {
        this.canvasManager.zoomOut()
      })
    }

    if (this.zoomHomeBtn) {
      this.addEvent(this.zoomHomeBtn, 'click', () => {
        this.canvasManager.zoomHome()
      })
    }

    // Escuchar eventos de cambio de herramientas disparados internamente en CanvasManager
    this.canvasManager.onToolChange = (activeTool) => {
      this.updateActiveToolUI(activeTool)
    }
  }

  updateActiveToolUI(activeTool) {
    Object.values(this.toolButtons).forEach((btn) => {
      if (btn) btn.classList.remove('is-active')
    })
    if (this.toolButtons[activeTool]) {
      this.toolButtons[activeTool].classList.add('is-active')
    }
  }
}
