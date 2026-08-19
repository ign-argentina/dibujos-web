import { describe, it, expect } from 'vitest'
import { generalTour } from '../tours/generalTour.js'

describe('generalTour', () => {
  it('debería tener metadatos válidos de tour (id, version, title)', () => {
    expect(generalTour.id).toBe('general')
    expect(generalTour.version).toBe(1)
    expect(typeof generalTour.title).toBe('string')
    expect(generalTour.title.length).toBeGreaterThan(0)
    expect(Array.isArray(generalTour.steps)).toBe(true)
  })

  it('debería contener exactamente los 12 pasos aprobados', () => {
    expect(generalTour.steps.length).toBe(12)
  })

  it('debería tener IDs únicos para cada paso', () => {
    const ids = generalTour.steps.map((step) => step.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('cada paso debe tener estructura válida y atributos obligatorios', () => {
    const validPlacements = ['top', 'bottom', 'left', 'right']

    generalTour.steps.forEach((step, index) => {
      expect(typeof step.id, `Paso ${index} debe tener id string`).toBe('string')
      expect(step.id.length).toBeGreaterThan(0)

      expect(typeof step.target, `Paso ${index} debe tener target string`).toBe('string')
      expect(step.target.startsWith('[data-tour=')).toBe(true)

      expect(typeof step.title, `Paso ${index} debe tener title string`).toBe('string')
      expect(step.title.length).toBeGreaterThan(0)

      expect(typeof step.text, `Paso ${index} debe tener text string`).toBe('string')
      expect(step.text.length).toBeGreaterThan(0)

      expect(validPlacements.includes(step.placement), `Paso ${index} placement inválido`).toBe(true)
    })
  })

  it('los textos deben ser demostrativos y no contener órdenes imperativas de clic', () => {
    generalTour.steps.forEach((step) => {
      expect(step.text.toLowerCase()).not.toContain('hacé clic ahora')
      expect(step.text.toLowerCase()).not.toContain('activá esta herramienta')
    })
  })
})
