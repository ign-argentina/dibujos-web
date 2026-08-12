import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ContextMenu } from '../ContextMenu.js'

describe('ContextMenu XSS Protection', () => {
  let container
  let mockCanvas
  let mockCanvasManager
  let contextMenu

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)

    mockCanvas = {
      getActiveObject: vi.fn(),
      requestRenderAll: vi.fn(),
      fire: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      isDrawingMode: false,
    }

    mockCanvasManager = {
      container,
      canvas: mockCanvas,
      currentMapImage: null,
      isDrawingShape: false,
    }

    // Limpiar variables globales potencialmente contaminadas por tests previos
    delete window.__xss

    contextMenu = new ContextMenu(mockCanvasManager)
  })

  afterEach(() => {
    contextMenu.unmount()
    container.remove()
    delete window.__xss
  })

  it('debería renderizar un texto normal en el textarea del editor sin alterar la lógica de negocio', () => {
    const textObject = {
      type: 'textbox',
      text: 'Mapa de Argentina',
      fontFamily: 'Fredoka',
      fontSize: 24,
      fill: '#000000',
    }

    contextMenu.buildPopoverContent(textObject)

    const textarea = container.querySelector('#ctx-text-content')
    expect(textarea).toBeTruthy()
    expect(textarea.value).toBe('Mapa de Argentina')
  })

  it('debería renderizar caracteres especiales de HTML de forma literal y no parsearlos como nodos del DOM', () => {
    const htmlTextObject = {
      type: 'textbox',
      text: '<mapa> & "Argentina"',
      fontFamily: 'Fredoka',
      fontSize: 24,
      fill: '#000000',
    }

    contextMenu.buildPopoverContent(htmlTextObject)

    const textarea = container.querySelector('#ctx-text-content')
    expect(textarea).toBeTruthy()
    expect(textarea.value).toBe('<mapa> & "Argentina"')

    // El DOM no debe contener un tag <mapa>
    const mapaElement = container.querySelector('mapa')
    expect(mapaElement).toBeNull()
  })

  it('debería bloquear payloads XSS de cierre de textarea evitando inyección de etiquetas HTML y ejecución de código', () => {
    const xssPayload = '</textarea><img src="invalid-image" onerror="window.__xss=true">'
    const xssTextObject = {
      type: 'textbox',
      text: xssPayload,
      fontFamily: 'Fredoka',
      fontSize: 24,
      fill: '#000000',
    }

    contextMenu.buildPopoverContent(xssTextObject)

    const textarea = container.querySelector('#ctx-text-content')
    expect(textarea).toBeTruthy()
    expect(textarea.value).toBe(xssPayload)

    // El DOM no debe contener un tag <img> inyectado
    const injectedImg = container.querySelector('img')
    // Nota: el inspector tiene otros iconos o imágenes, pero buscamos específicamente la de onerror/invalid-image
    if (injectedImg) {
      expect(injectedImg.getAttribute('src')).not.toBe('invalid-image')
    }

    // La variable global no debe ser alterada (lo que confirma que no se ejecutó el onerror)
    expect(window.__xss).toBeUndefined()
  })
})
