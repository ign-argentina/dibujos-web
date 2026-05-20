import { Canvas } from 'fabric'

export class CanvasManager {
  constructor(container, options = {}) {
    if (!(container instanceof HTMLElement)) {
      throw new TypeError('CanvasManager espera un contenedor HTML válido')
    }

    this.container = container
    this.options = options
    this.canvas = null
    this.canvasEl = null
    this.resizeObserver = null
  }

  init() {
    this.createCanvasElement()
    this.canvas = new Canvas(this.canvasEl, {
      selection: true,
      preserveObjectStacking: true,
      ...this.options,
    })
    this.observeResize()
    this.resizeCanvas()
  }

  createCanvasElement() {
    this.canvasEl = document.createElement('canvas')
    this.canvasEl.className = 'fabric-canvas'
    this.container.appendChild(this.canvasEl)
  }

  resizeCanvas() {
    if (!this.canvas) return

    const rect = this.container.getBoundingClientRect()
    const width = Math.max(Math.round(rect.width), 0)
    const height = Math.max(Math.round(rect.height), 0)

    if (!width || !height) return

    //this.canvas.setWidth(width)
    //this.canvas.setHeight(height)
    this.canvas.calcOffset()
    this.canvas.renderAll()
  }

  observeResize() {
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas())
      this.resizeObserver.observe(this.container)
    } else {
      window.addEventListener('resize', () => this.resizeCanvas())
    }
  }

  dispose() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }

    if (this.canvas) {
      this.canvas.dispose()
      this.canvas = null
    }
  }
}
