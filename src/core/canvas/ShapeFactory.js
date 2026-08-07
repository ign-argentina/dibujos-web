import { Rect, Circle, Textbox, Path, Polyline, Polygon } from 'fabric'

/**
 * Fábrica estática para la creación centralizada de objetos/formas del lienzo.
 * Sigue el patrón Factory Method y el principio de Abierto/Cerrado (OCP).
 */
export class ShapeFactory {
  /**
   * Crea una figura rectangular
   * @param {Object} options
   * @returns {Rect}
   */
  static createRect(options = {}) {
    return new Rect({
      width: options.width || 140,
      height: options.height || 100,
      fill: options.color || '#000000',
      stroke: options.color || '#000000',
      strokeWidth: 2,
      rx: 4,
      ry: 4,
      originX: options.originX || 'center',
      originY: options.originY || 'center',
      opacity: 0.7,
      selectable: options.selectable !== undefined ? options.selectable : true,
      evented: options.evented !== undefined ? options.evented : true,
      ...options,
    })
  }

  /**
   * Crea una figura circular
   * @param {Object} options
   * @returns {Circle}
   */
  static createCircle(options = {}) {
    return new Circle({
      radius: options.radius || 60,
      fill: options.color || '#000000',
      stroke: options.color || '#000000',
      strokeWidth: 2,
      originX: options.originX || 'center',
      originY: options.originY || 'center',
      opacity: 0.7,
      selectable: options.selectable !== undefined ? options.selectable : true,
      evented: options.evented !== undefined ? options.evented : true,
      ...options,
    })
  }

  /**
   * Crea un camino/trazo de flecha
   * @param {string} pathString - Cadena SVG Path
   * @param {Object} options
   * @returns {Path}
   */
  static createArrow(pathString, options = {}) {
    return new Path(pathString, {
      stroke: options.color || '#000000',
      strokeWidth: options.strokeWidth || 8,
      fill: 'transparent',
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      originX: options.originX || 'center',
      originY: options.originY || 'center',
      selectable: options.selectable !== undefined ? options.selectable : true,
      evented: options.evented !== undefined ? options.evented : true,
      ...options,
    })
  }

  /**
   * Crea un cuadro de texto editable
   * @param {string} text - Texto por defecto
   * @param {Object} options
   * @returns {Textbox}
   */
  static createText(text, options = {}) {
    return new Textbox(text || 'Escribí acá', {
      fontFamily: 'Fredoka',
      fontSize: 24,
      fontWeight: '500',
      fill: options.color || '#000000',
      stroke: 'transparent',
      originX: options.originX || 'center',
      originY: options.originY || 'center',
      textAlign: options.textAlign || 'center',
      width: options.width || 180,
      selectable: options.selectable !== undefined ? options.selectable : true,
      evented: options.evented !== undefined ? options.evented : true,
      ...options,
    })
  }

  /**
   * Crea un pin marcador neo-brutalista
   * @param {Object} options
   * @returns {Path}
   */
  static createPin(options = {}) {
    return new Path(
      'M 0 0 C -12 -13 -18 -24 -18 -34 A 18 18 0 1 1 18 -34 C 18 -24 12 -13 0 0 Z M 0 -40 A 6 6 0 1 0 0 -28 A 6 6 0 1 0 0 -40 Z',
      {
        fill: options.color || '#000000',
        stroke: '#000000',
        strokeWidth: 3,
        originX: options.originX || 'center',
        originY: options.originY || 'bottom',
        opacity: 0.9,
        selectable: options.selectable !== undefined ? options.selectable : true,
        evented: options.evented !== undefined ? options.evented : true,
        ...options,
      }
    )
  }

  /**
   * Crea una polilínea
   * @param {Array<Object>} points
   * @param {Object} options
   * @returns {Polyline}
   */
  static createPolyline(points = [], options = {}) {
    return new Polyline(points, {
      fill: 'transparent',
      stroke: options.color || '#000000',
      strokeWidth: options.strokeWidth || 4,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      originX: 'left',
      originY: 'top',
      selectable: options.selectable !== undefined ? options.selectable : true,
      evented: options.evented !== undefined ? options.evented : true,
      ...options,
    })
  }

  /**
   * Crea un polígono libre
   * @param {Array<Object>} points
   * @param {Object} options
   * @returns {Polygon}
   */
  static createPolygon(points = [], options = {}) {
    return new Polygon(points, {
      fill: options.color || '#000000',
      stroke: options.color || '#000000',
      strokeWidth: options.strokeWidth || 4,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      originX: 'left',
      originY: 'top',
      opacity: 0.7,
      selectable: options.selectable !== undefined ? options.selectable : true,
      evented: options.evented !== undefined ? options.evented : true,
      ...options,
    })
  }
}
