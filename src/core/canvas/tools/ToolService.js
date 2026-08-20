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
   * Aplica la política central de interacción y limpia selecciones previas de forma coherente.
   * @param {string} toolName
   */
  setTool(toolName) {
    const nextTool = this.tools.get(toolName) || this.tools.get('pan')
    const normalizedName = this.tools.has(toolName) ? toolName : 'pan'

    // Si la herramienta solicitada ya está activa, no hacer nada (preserva selección en select)
    if (this.activeTool === nextTool) return

    // 1. Salir de forma segura del modo edición de texto si corresponde
    const activeObj = this.canvasManager.adapter?.getActiveObject()
    if (activeObj && activeObj.isEditing && typeof activeObj.exitEditing === 'function') {
      activeObj.exitEditing()
    }

    // 2. Si la herramienta entrante no es selección, descartar objeto activo / ActiveSelection
    if (normalizedName !== 'select' && this.canvasManager.adapter) {
      this.canvasManager.adapter.discardActiveObject()
      this.canvasManager.adapter.requestRenderAll()
    }

    // 3. Desactivar herramienta previa (permite confirmar geometrías válidas pendientes)
    if (this.activeTool) {
      this.activeTool.onDeactivate()
    }

    // 4. Configurar la política centralizada del lienzo según la categoría de herramienta
    this.applyInteractionPolicy(normalizedName)

    // 5. Activar nueva herramienta
    this.activeToolName = normalizedName
    this.activeTool = nextTool
    nextTool.onActivate()
  }

  /**
   * Aplica la política central de interacción del lienzo según la categoría de herramienta.
   * @param {string} toolName
   */
  applyInteractionPolicy(toolName) {
    const adapter = this.canvasManager.adapter
    if (!adapter) return

    switch (toolName) {
      case 'select':
        adapter.setDrawingMode(false)
        adapter.setSelectionEnabled(true)
        adapter.setSkipTargetFind(false)
        adapter.setDefaultCursor('default')
        break

      case 'pan':
        adapter.setDrawingMode(false)
        adapter.setSelectionEnabled(false)
        adapter.setSkipTargetFind(true)
        adapter.setDefaultCursor('grab')
        break

      case 'brush':
        adapter.setDrawingMode(true)
        if (typeof this.canvasManager.configureDrawingBrush === 'function') {
          this.canvasManager.configureDrawingBrush()
        }
        adapter.setSelectionEnabled(false)
        adapter.setSkipTargetFind(true)
        adapter.setDefaultCursor('default')
        break

      default:
        // Herramientas de creación: rect, circle, arrow, polyline, polygon, text, pin
        adapter.setDrawingMode(false)
        adapter.setSelectionEnabled(false)
        adapter.setSkipTargetFind(true)
        adapter.setDefaultCursor('crosshair')
        break
    }
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
