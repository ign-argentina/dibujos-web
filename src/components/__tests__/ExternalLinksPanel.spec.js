import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ExternalLinksPanel } from '../ExternalLinksPanel.js'

describe('ExternalLinksPanel', () => {
  let container

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'view-links'
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('debería renderizar los 4 enlaces externos oficiales con sus URLs y atributos de seguridad', () => {
    const panel = new ExternalLinksPanel(container)
    panel.mount()

    expect(container.querySelector('.nbi-links-panel')).not.toBeNull()
    const cards = container.querySelectorAll('.nbi-link-card')
    expect(cards.length).toBe(4)

    const expectedUrls = [
      'https://www.ign.gob.ar/',
      'https://mapa.ign.gob.ar/',
      'https://anida.ign.gob.ar/',
      'https://www.ign.gob.ar/AreaServicios/Descargas/MapasEscolares'
    ]

    cards.forEach((card, index) => {
      const link = card.querySelector('a')
      expect(link).not.toBeNull()
      expect(link.getAttribute('href')).toBe(expectedUrls[index])
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
      expect(link.getAttribute('aria-label')).toContain('nueva pestaña')
    })
  })

  it('debería soportar configuración personalizada de intro y recursos', () => {
    const customResources = [
      {
        id: 'test-link',
        title: 'Enlace de Prueba',
        url: 'https://test.ign.gob.ar',
        description: 'Descripción de prueba',
        tag: 'Prueba',
        icon: 'globe'
      }
    ]

    const panel = new ExternalLinksPanel(container, {
      intro: 'Introducción personalizada para la escuela.',
      resources: customResources,
      buttonText: 'Explorar'
    })
    panel.mount()

    expect(container.querySelector('.nbi-links-panel__intro-text').textContent).toBe(
      'Introducción personalizada para la escuela.'
    )
    const cards = container.querySelectorAll('.nbi-link-card')
    expect(cards.length).toBe(1)
    expect(container.querySelector('.nbi-link-card__title').textContent).toBe('Enlace de Prueba')
    expect(container.querySelector('.nbi-link-card__btn span').textContent).toBe('Explorar')
  })

  it('debería limpiar el contenedor al desmontarse con unmount()', () => {
    const panel = new ExternalLinksPanel(container)
    panel.mount()
    expect(container.innerHTML).not.toBe('')

    panel.unmount()
    expect(container.innerHTML).toBe('')
  })
})
