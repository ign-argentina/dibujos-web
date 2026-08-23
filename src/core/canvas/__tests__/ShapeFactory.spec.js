import { describe, it, expect, vi } from 'vitest'
import { ShapeFactory } from '../ShapeFactory.js'

// Simular Fabric.js para tests aislados
vi.mock('fabric', () => {
  class MockRect {
    constructor(opts) {
      Object.assign(this, opts)
      this.type = 'rect'
    }
  }

  class MockCircle {
    constructor(opts) {
      Object.assign(this, opts)
      this.type = 'circle'
    }
  }

  class MockTextbox {
    constructor(text, opts) {
      Object.assign(this, typeof text === 'string' ? { text, ...opts } : text)
      this.type = 'textbox'
    }
  }

  class MockPath {
    constructor(pathString, opts) {
      Object.assign(this, typeof pathString === 'string' ? { pathString, ...opts } : pathString)
      this.type = 'path'
    }
  }

  class MockPolyline {
    constructor(points, opts) {
      this.points = points
      Object.assign(this, opts)
      this.type = 'polyline'
    }
  }

  class MockPolygon {
    constructor(points, opts) {
      this.points = points
      Object.assign(this, opts)
      this.type = 'polygon'
    }
  }

  return {
    Rect: MockRect,
    Circle: MockCircle,
    Textbox: MockTextbox,
    Path: MockPath,
    Polyline: MockPolyline,
    Polygon: MockPolygon,
  }
})

describe('ShapeFactory', () => {
  it('debería instanciar un Rect con opciones correctas', () => {
    const rect = ShapeFactory.createRect({ color: '#FF0000', left: 10, top: 20 })
    expect(rect.type).toBe('rect')
    expect(rect.fill).toBe('#FF0000')
    expect(rect.stroke).toBe('#FF0000')
    expect(rect.left).toBe(10)
    expect(rect.top).toBe(20)
    expect(rect.rx).toBe(12)
    expect(rect.ry).toBe(12)
  })

  it('debería instanciar un Circle con opciones correctas', () => {
    const circle = ShapeFactory.createCircle({ color: '#00FF00', left: 30, top: 40, radius: 50 })
    expect(circle.type).toBe('circle')
    expect(circle.fill).toBe('#00FF00')
    expect(circle.radius).toBe(50)
    expect(circle.left).toBe(30)
    expect(circle.top).toBe(40)
  })

  it('debería instanciar una Arrow con opciones correctas', () => {
    const arrow = ShapeFactory.createArrow('M 0 0 L 100 100', { color: '#0000FF', strokeWidth: 5 })
    expect(arrow.type).toBe('path')
    expect(arrow.pathString).toBe('M 0 0 L 100 100')
    expect(arrow.stroke).toBe('#0000FF')
    expect(arrow.strokeWidth).toBe(5)
    expect(arrow.fill).toBe('transparent')
  })

  it('debería instanciar un Text con opciones correctas', () => {
    const text = ShapeFactory.createText('Mi texto', { color: '#FFFF00', fontSize: 30 })
    expect(text.type).toBe('textbox')
    expect(text.text).toBe('Mi texto')
    expect(text.fill).toBe('#FFFF00')
    expect(text.fontSize).toBe(30)
    expect(text.fontFamily).toBe('Fredoka')
  })

  it('debería instanciar un Pin con opciones correctas', () => {
    const pin = ShapeFactory.createPin({ color: '#FF00FF', left: 15, top: 25 })
    expect(pin.type).toBe('path')
    expect(pin.fill).toBe('#FF00FF')
    expect(pin.stroke).toBe('#000000')
    expect(pin.strokeWidth).toBe(3)
    expect(pin.originY).toBe('bottom')
  })

  it('debería instanciar una Polyline con opciones correctas', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 10 }]
    const polyline = ShapeFactory.createPolyline(points, { color: '#FF0000', strokeWidth: 5 })
    expect(polyline.type).toBe('polyline')
    expect(polyline.points).toEqual(points)
    expect(polyline.stroke).toBe('#FF0000')
    expect(polyline.strokeWidth).toBe(5)
    expect(polyline.fill).toBe('transparent')
  })

  it('debería instanciar un Polygon con opciones correctas', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
    const polygon = ShapeFactory.createPolygon(points, { color: '#00FF00', strokeWidth: 5 })
    expect(polygon.type).toBe('polygon')
    expect(polygon.points).toEqual(points)
    expect(polygon.stroke).toBe('#00FF00')
    expect(polygon.strokeWidth).toBe(5)
    expect(polygon.fill).toBe('#00FF00')
  })
})
