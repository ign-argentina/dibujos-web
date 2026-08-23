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

  it('debería mantener la posición personalizada del menú tras moverlo y no restablecerla al modificar propiedades', () => {
    const rectObject = {
      type: 'rect',
      set: vi.fn(),
      setCoords: vi.fn(),
      oCoords: {
        tl: { x: 50, y: 50 },
        tr: { x: 150, y: 50 },
      },
    }

    mockCanvas.getActiveObject.mockReturnValue(rectObject)
    contextMenu.openPopover()

    // Verificar posición inicial calculada
    expect(contextMenu.popoverMenu.style.left).not.toBe('')
    expect(contextMenu.popoverMenu.style.top).not.toBe('')

    // Simular arrastre manual del header
    const header = contextMenu.popoverMenu.querySelector('.nbi-context__header')
    expect(header).toBeTruthy()

    // Establecer posición personalizada simulada por arrastre
    contextMenu.popoverMenu.style.left = '350px'
    contextMenu.popoverMenu.style.top = '220px'
    contextMenu.hasCustomPosition = true

    // Simular evento object:modified (por ejemplo al cambiar color o grosor)
    const onObjectModified = mockCanvas.on.mock.calls.find(call => call[0] === 'object:modified')?.[1]
    expect(onObjectModified).toBeDefined()
    onObjectModified()

    // La posición debe mantenerse exactamente en 350px y 220px
    expect(contextMenu.popoverMenu.style.left).toBe('350px')
    expect(contextMenu.popoverMenu.style.top).toBe('220px')
  })

  it('debería ocultar/colapsar sidebar-catalog y properties-panel al abrirse el menú contextual', () => {
    // Crear sidebars en el DOM
    const sidebarCatalog = document.createElement('aside')
    sidebarCatalog.id = 'sidebar-catalog'
    sidebarCatalog.className = 'nbi-sidebar'
    document.body.appendChild(sidebarCatalog)

    const propertiesPanel = document.createElement('aside')
    propertiesPanel.id = 'properties-panel'
    propertiesPanel.className = 'nbi-properties'
    document.body.appendChild(propertiesPanel)

    const circleObject = {
      type: 'circle',
      set: vi.fn(),
      setCoords: vi.fn(),
      oCoords: {
        tl: { x: 20, y: 20 },
        tr: { x: 80, y: 20 },
      },
    }

    mockCanvas.getActiveObject.mockReturnValue(circleObject)
    contextMenu.openPopover()

    expect(sidebarCatalog.classList.contains('is-collapsed')).toBe(true)
    expect(propertiesPanel.classList.contains('is-collapsed')).toBe(true)

    sidebarCatalog.remove()
    propertiesPanel.remove()
  })

  it('debería renderizar los botones de acción con los iconos correspondientes (copy, bring-to-front/send-to-front, send-to-back)', () => {
    const rectObject = {
      type: 'rect',
      set: vi.fn(),
      setCoords: vi.fn(),
      oCoords: {
        tl: { x: 50, y: 50 },
        tr: { x: 150, y: 50 },
      },
    }

    contextMenu.buildPopoverContent(rectObject)

    const duplicateBtn = container.querySelector('#ctx-act-duplicate')
    const frontBtn = container.querySelector('#ctx-act-front')
    const backBtn = container.querySelector('#ctx-act-back')

    expect(duplicateBtn.querySelector('i[data-lucide="copy"]')).toBeTruthy()
    expect(frontBtn.querySelector('i[data-lucide="bring-to-front"], i[data-lucide="send-to-front"]')).toBeTruthy()
    expect(backBtn.querySelector('i[data-lucide="send-to-back"]')).toBeTruthy()
  })
})
