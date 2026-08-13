import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Sidebar } from '../Sidebar.js'
import { MapSelector } from '../MapSelector.js'

describe('Sidebar', () => {
  let container
  let views

  beforeEach(() => {
    // Preparar el DOM de prueba
    container = document.createElement('div')
    container.id = 'sidebar-catalog'
    container.className = 'nbi-sidebar is-collapsed'
    container.innerHTML = `
      <div class="nbi-sidebar__tabs" role="tablist"></div>
      <div class="nbi-sidebar__window">
        <div class="nbi-sidebar__header">
          <h2 class="nbi-sidebar__title" id="sidebar-title">Elegí tu Mapa</h2>
          <button class="nbi-btn" id="close-sidebar-btn" aria-label="Cerrar panel">Close</button>
        </div>
        <div class="nbi-sidebar__view" id="view-maps">
          <div id="map-cards-container"></div>
        </div>
        <div class="nbi-sidebar__view hidden" id="view-accessibility"></div>
      </div>
    `
    document.body.appendChild(container)

    views = [
      { id: 'maps', label: 'Mapas', title: 'Elegí tu Mapa', icon: 'map' },
      { id: 'accessibility', label: 'Accesibilidad', title: 'Accesibilidad', icon: 'accessibility' }
    ]
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('debería renderizar las solapas declarativas', () => {
    const sidebar = new Sidebar(container, { views })
    sidebar.mount()

    const tabs = container.querySelectorAll('.nbi-sidebar__tab')
    expect(tabs.length).toBe(2)
    expect(tabs[0].getAttribute('aria-label')).toBe('Mapas')
    expect(tabs[1].getAttribute('aria-label')).toBe('Accesibilidad')

    sidebar.destroy()
  })

  it('debería abrir el panel y marcar la pestaña correspondiente al hacer clic en una solapa estando cerrado', () => {
    const sidebar = new Sidebar(container, { views })
    sidebar.mount()

    expect(container.classList.contains('is-collapsed')).toBe(true)

    const tabMaps = container.querySelector('#tab-maps')
    tabMaps.click()

    expect(container.classList.contains('is-collapsed')).toBe(false)
    expect(tabMaps.classList.contains('is-active')).toBe(true)
    expect(tabMaps.getAttribute('aria-selected')).toBe('true')

    sidebar.destroy()
  })

  it('debería cambiar de vista al hacer clic en otra solapa manteniendo el panel abierto', () => {
    const sidebar = new Sidebar(container, { views })
    sidebar.mount()

    const tabMaps = container.querySelector('#tab-maps')
    const tabAccess = container.querySelector('#tab-accessibility')

    // Abrir con Maps
    tabMaps.click()
    expect(sidebar.activeViewId).toBe('maps')
    expect(container.querySelector('#view-maps').classList.contains('hidden')).toBe(false)
    expect(container.querySelector('#view-accessibility').classList.contains('hidden')).toBe(true)

    // Cambiar a Accesibilidad
    tabAccess.click()
    expect(sidebar.activeViewId).toBe('accessibility')
    expect(container.querySelector('#view-maps').classList.contains('hidden')).toBe(true)
    expect(container.querySelector('#view-accessibility').classList.contains('hidden')).toBe(false)
    expect(container.classList.contains('is-collapsed')).toBe(false)

    sidebar.destroy()
  })

  it('debería cerrar el panel al hacer clic en la solapa activa', () => {
    const sidebar = new Sidebar(container, { views })
    sidebar.mount()

    const tabMaps = container.querySelector('#tab-maps')

    // Abrir
    tabMaps.click()
    expect(container.classList.contains('is-collapsed')).toBe(false)

    // Clic en activa de nuevo -> Cerrar
    tabMaps.click()
    expect(container.classList.contains('is-collapsed')).toBe(true)

    sidebar.destroy()
  })

  it('debería cerrar el panel al hacer clic en el botón de cierre interno', () => {
    const sidebar = new Sidebar(container, { views })
    sidebar.mount()

    const tabMaps = container.querySelector('#tab-maps')
    tabMaps.click()
    expect(container.classList.contains('is-collapsed')).toBe(false)

    const closeBtn = container.querySelector('#close-sidebar-btn')
    closeBtn.click()
    expect(container.classList.contains('is-collapsed')).toBe(true)

    sidebar.destroy()
  })

  it('debería cerrar el panel al presionar la tecla Escape', () => {
    const sidebar = new Sidebar(container, { views })
    sidebar.mount()

    const tabMaps = container.querySelector('#tab-maps')
    tabMaps.click()
    expect(container.classList.contains('is-collapsed')).toBe(false)

    // Simular Escape
    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    window.dispatchEvent(event)

    expect(container.classList.contains('is-collapsed')).toBe(true)

    sidebar.destroy()
  })

  it('debería admitir navegación por teclado (flechas) entre solapas', () => {
    const sidebar = new Sidebar(container, { views })
    sidebar.mount()

    const tabMaps = container.querySelector('#tab-maps')
    const tabAccess = container.querySelector('#tab-accessibility')

    tabMaps.focus()
    expect(document.activeElement).toBe(tabMaps)

    // Flecha abajo -> enfoca accesibilidad
    const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    tabMaps.dispatchEvent(arrowDownEvent)

    expect(document.activeElement).toBe(tabAccess)

    sidebar.destroy()
  })

  it('debería mantener la integración con MapSelector de forma correcta', async () => {
    const sidebar = new Sidebar(container, { views })
    sidebar.mount()

    const cardsContainer = container.querySelector('#map-cards-container')
    const mockMapRepository = {
      getAll: vi.fn().mockResolvedValue([
        { id: '1', name: 'Salta', category: 'provincia', thumbnailUrl: '/thumbnails/salta.png' }
      ])
    }

    const mapSelector = new MapSelector(container.querySelector('#view-maps'), cardsContainer, mockMapRepository)
    await mapSelector.init()

    // Verificar que MapSelector ha inyectado sus controles y tarjetas
    expect(container.querySelector('#map-search-input')).not.toBeNull()
    const cards = cardsContainer.querySelectorAll('.nbi-map-card')
    expect(cards.length).toBe(1)
    expect(cards[0].textContent.trim()).toBe('Salta')

    mapSelector.destroy()
    sidebar.destroy()
  })
})
