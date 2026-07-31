/**
 * Clase base abstracta para todas las herramientas de dibujo.
 * Define la interfaz Strategy común.
 */
export class BaseTool {
  constructor(canvasManager) {
    this.canvasManager = canvasManager
  }

  onActivate() {}
  onDeactivate() {}
  onMouseDown(_opt) {}
  onMouseMove(_opt) {}
  onMouseUp(_opt) {}
}
