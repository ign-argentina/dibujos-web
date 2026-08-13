import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MapSelector } from '../MapSelector.js'
import { appStore } from '../../state/AppStore.js'

describe('MapSelector', () => {
  let sidebarContainer
  let cardsContainer
  let mockMapRepository
  let mapsData

  beforeEach(() => {
    // Restablecer el estado del almacén para pruebas consistentes
    appStore.dispatch({ type: 'SET_ACTIVE_MAP_ID', payload: '1' })

    sidebarContainer = document.createElement('div')
    cardsContainer = document.createElement('div')
    sidebarContainer.appendChild(cardsContainer)

    mapsData = [
      { id: '1', name: 'Salta', category: 'provincia', thumbnailUrl: '/thumbnails/salta.png' },
      { id: '2', name: 'Jujuy', category: 'provincia', thumbnailUrl: '/thumbnails/jujuy.png' },
    ]

    mockMapRepository = {
      getAll: vi.fn().mockResolvedValue(mapsData),
    }
  })

  it('debería renderizar los controles y tarjetas de mapa', async () => {
    const selector = new MapSelector(sidebarContainer, cardsContainer, mockMapRepository)
    await selector.init()

    // Control de búsqueda creado
    expect(sidebarContainer.querySelector('#map-search-input')).not.toBeNull()
    // Dos tarjetas creadas
    const cards = cardsContainer.querySelectorAll('.nbi-map-card')
    expect(cards.length).toBe(2)
    expect(cards[0].textContent.trim()).toBe('Salta')
    expect(cards[1].textContent.trim()).toBe('Jujuy')
  })

  it('debería seleccionar un mapa por click e interactuar con el store una sola vez', async () => {
    const selector = new MapSelector(sidebarContainer, cardsContainer, mockMapRepository)
    await selector.init()

    const dispatchSpy = vi.spyOn(appStore, 'dispatch')
    const cards = cardsContainer.querySelectorAll('.nbi-map-card')
    
    // Hacer click en la segunda tarjeta (Jujuy)
    cards[1].click()

    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    expect(dispatchSpy).toHaveBeenCalledWith({ type: 'SET_ACTIVE_MAP_ID', payload: '2' })
    dispatchSpy.mockRestore()
  })

  it('debería destruir y limpiar controles e innerHTML del contenedor de tarjetas', async () => {
    const selector = new MapSelector(sidebarContainer, cardsContainer, mockMapRepository)
    await selector.init()

    expect(sidebarContainer.querySelector('.nbi-sidebar__controls')).not.toBeNull()
    expect(cardsContainer.innerHTML).not.toBe('')

    selector.destroy()

    expect(sidebarContainer.querySelector('.nbi-sidebar__controls')).toBeNull()
    expect(cardsContainer.innerHTML).toBe('')
  })

  it('debería poder instanciarse y funcionar una nueva instancia después de destruir la anterior', async () => {
    const selector1 = new MapSelector(sidebarContainer, cardsContainer, mockMapRepository)
    await selector1.init()
    selector1.destroy()

    const selector2 = new MapSelector(sidebarContainer, cardsContainer, mockMapRepository)
    await selector2.init()

    const dispatchSpy = vi.spyOn(appStore, 'dispatch')
    const cards = cardsContainer.querySelectorAll('.nbi-map-card')
    cards[0].click()

    // Debería responder una única vez
    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    dispatchSpy.mockRestore()
  })
})
