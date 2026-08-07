import { SelectTool } from './SelectTool.js'
import { BrushTool } from './BrushTool.js'
import { RectTool } from './RectTool.js'
import { CircleTool } from './CircleTool.js'
import { ArrowTool } from './ArrowTool.js'
import { TextTool } from './TextTool.js'
import { PinTool } from './PinTool.js'
import { PolylineTool } from './PolylineTool.js'
import { PolygonTool } from './PolygonTool.js'
import { PanTool } from './PanTool.js'

/**
 * Controlador de herramientas de dibujo del lienzo.
 * Sigue el patrón Strategy y gestiona la activación y despacho de eventos del mouse.
 */
export class ToolService {
  constructor(canvasManager) {
    this.canvasManager = canvasManager
    this.tools = new Map()
    this.activeToolName = 'pan'
    this.activeTool = null

    this.registerTools()
  }

  registerTools() {
    this.tools.set('pan', new PanTool(this.canvasManager))
    this.tools.set('select', new SelectTool(this.canvasManager))
    this.tools.set('brush', new BrushTool(this.canvasManager))
    this.tools.set('rect', new RectTool(this.canvasManager))
    this.tools.set('circle', new CircleTool(this.canvasManager))
    this.tools.set('arrow', new ArrowTool(this.canvasManager))
    this.tools.set('text', new TextTool(this.canvasManager))
    this.tools.set('pin', new PinTool(this.canvasManager))
    this.tools.set('polyline', new PolylineTool(this.canvasManager))
    this.tools.set('polygon', new PolygonTool(this.canvasManager))
  }

  /**
   * Configura la herramienta activa por su nombre.
   * @param {string} toolName
   */
  setTool(toolName) {
    const nextTool = this.tools.get(toolName) || this.tools.get('pan')
    if (this.activeTool === nextTool) return

    if (this.activeTool) {
      this.activeTool.onDeactivate()
    }
    this.activeToolName = toolName
    this.activeTool = nextTool
    nextTool.onActivate()
  }

  /**
   * Despacha el evento mousedown del ratón a la herramienta activa.
   * @param {Object} opt
   */
  handleMouseDown(opt) {
    if (this.activeTool) {
      this.activeTool.onMouseDown(opt)
    }
  }

  /**
   * Despacha el evento mousemove del ratón a la herramienta activa.
   * @param {Object} opt
   */
  handleMouseMove(opt) {
    if (this.activeTool) {
      this.activeTool.onMouseMove(opt)
    }
  }

  /**
   * Despacha el evento mouseup del ratón a la herramienta activa.
   * @param {Object} opt
   */
  handleMouseUp(opt) {
    if (this.activeTool) {
      this.activeTool.onMouseUp(opt)
    }
  }

  /**
   * Despacha el evento dblclick del ratón a la herramienta activa.
   * @param {Object} opt
   */
  handleMouseDblClick(opt) {
    if (this.activeTool && typeof this.activeTool.onMouseDblClick === 'function') {
      this.activeTool.onMouseDblClick(opt)
    }
  }
}
