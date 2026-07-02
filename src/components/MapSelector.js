import { mapsCatalog } from '../config/mapsCatalog.js'
import { appState } from '../state/appState.js'

export class MapSelector {
  constructor(sidebarContainer, cardsContainer) {
    if (!(sidebarContainer instanceof HTMLElement)) {
      throw new TypeError('MapSelector espera un contenedor lateral HTML válido')
    }
    if (!(cardsContainer instanceof HTMLElement)) {
      throw new TypeError('MapSelector espera un contenedor de tarjetas HTML válido')
    }

    this.sidebarContainer = sidebarContainer
    this.cardsContainer = cardsContainer
    this.currentFilter = 'todos' // 'todos', 'provincia', 'otros'
    this.searchQuery = ''
    this.filteredMaps = [...mapsCatalog]

    this.init()
  }

  init() {
    this.createControls()
    this.render()
    this.setupListeners()
  }

  createControls() {
    // Crear el contenedor de controles para búsqueda y filtros con accesibilidad
    const controlsDiv = document.createElement('div')
    controlsDiv.className = 'nbi-sidebar-controls'
    controlsDiv.innerHTML = `
      <div class="nbi-search-wrapper">
        <span class="nbi-search-icon" id="search-icon-container" aria-hidden="true">
          <i data-lucide="search"></i>
        </span>
        <input type="text" id="map-search-input" class="nbi-input" placeholder="Buscar mapa..." autocomplete="off" aria-label="Buscar mapas" title="Buscar mapas" />
        <button class="nbi-search-clear-btn hidden" id="map-search-clear" title="Reiniciar búsqueda" aria-label="Reiniciar búsqueda">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="nbi-filter-group" role="group" aria-label="Filtros de mapas">
        <button class="nbi-filter-btn is-active" data-filter="todos" aria-label="Mostrar todos los mapas" title="Mostrar todos los mapas">Todos</button>
        <button class="nbi-filter-btn" data-filter="provincia" aria-label="Mostrar solo mapas de provincias" title="Mostrar solo mapas de provincias">Provincias</button>
        <button class="nbi-filter-btn" data-filter="otros" aria-label="Mostrar otros tipos de mapas" title="Mostrar otros tipos de mapas">Otros</button>
      </div>
    `
    // Insertar los controles antes del contenedor de tarjetas en la barra lateral
    this.cardsContainer.parentNode.insertBefore(controlsDiv, this.cardsContainer)

    this.searchInput = controlsDiv.querySelector('#map-search-input')
    this.clearBtn = controlsDiv.querySelector('#map-search-clear')
    this.filterButtons = controlsDiv.querySelectorAll('.nbi-filter-btn')

    // Inicializar iconos de Lucide cargados dinámicamente si la librería está disponible
    if (window.lucide) {
      window.lucide.createIcons()
    }
  }

  setupListeners() {
    // Eventos de los botones de filtro
    this.filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.filterButtons.forEach((b) => b.classList.remove('is-active'))
        btn.classList.add('is-active')
        this.currentFilter = btn.getAttribute('data-filter')
        this.filterAndRender()
      })
    })

    // Evento de escritura en la barra de búsqueda
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim()
      this.toggleClearButton()
      this.filterAndRender()
    })

    // Evento de clic en el botón de reiniciar búsqueda
    this.clearBtn.addEventListener('click', () => {
      this.searchInput.value = ''
      this.searchQuery = ''
      this.toggleClearButton()
      this.filterAndRender()
      this.searchInput.focus()
    })

    // Evento de teclado en la barra de búsqueda (Enter para seleccionar)
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.selectFirstMatched()
      }
    })

    // Suscribirse a cambios en el estado global para sincronizar la clase activa
    appState.subscribe((state) => {
      this.updateActiveCardUI(state.activeMapId)
    })
  }

  toggleClearButton() {
    if (this.searchQuery.length > 0) {
      this.clearBtn.classList.remove('hidden')
    } else {
      this.clearBtn.classList.add('hidden')
    }
  }

  filterAndRender() {
    this.filteredMaps = mapsCatalog.filter((map) => {
      // Filtrado por categoría
      const matchesCategory = this.currentFilter === 'todos' || map.category === this.currentFilter
      // Filtrado por texto (búsqueda)
      const matchesSearch = !this.searchQuery || map.name.toLowerCase().includes(this.searchQuery)
      return matchesCategory && matchesSearch
    })

    this.render()
  }

  render() {
    this.cardsContainer.innerHTML = ''

    if (this.filteredMaps.length === 0) {
      const emptyMsg = document.createElement('div')
      emptyMsg.className = 'nbi-sidebar-empty'
      emptyMsg.textContent = 'No se encontraron mapas'
      this.cardsContainer.appendChild(emptyMsg)
      return
    }

    this.filteredMaps.forEach((map) => {
      const card = document.createElement('div')
      card.className = 'nbi-map-card'
      card.id = `card-${map.id}`
      card.title = `Seleccionar mapa de ${map.name}`
      card.setAttribute('role', 'button')
      card.setAttribute('tabindex', '0')
      card.setAttribute('aria-label', `Seleccionar mapa de ${map.name}`)

      if (appState.getActiveMapId() === map.id) {
        card.classList.add('is-active')
        card.setAttribute('aria-pressed', 'true')
      } else {
        card.setAttribute('aria-pressed', 'false')
      }

      card.innerHTML = `
        <img class="nbi-map-card-image" src="${map.thumbnailUrl}" alt="${map.name}" loading="lazy" />
        <div class="nbi-map-card-info">${map.name}</div>
      `

      card.addEventListener('click', () => {
        appState.setActiveMapId(map.id)
      })

      // Evento de teclado para accesibilidad (Enter y Espacio)
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          appState.setActiveMapId(map.id)
        }
      })

      this.cardsContainer.appendChild(card)
    })
  }

  selectFirstMatched() {
    if (this.filteredMaps.length > 0) {
      const targetMap = this.filteredMaps[0]
      appState.setActiveMapId(targetMap.id)
      this.searchInput.blur()
    }
  }

  updateActiveCardUI(activeMapId) {
    this.cardsContainer.querySelectorAll('.nbi-map-card').forEach((card) => {
      card.classList.remove('is-active')
    })
    const activeCard = this.cardsContainer.querySelector(`#card-${activeMapId}`)
    if (activeCard) {
      activeCard.classList.add('is-active')
      // Desplazar suavemente la tarjeta activa para que sea visible en el scroll
      activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }
}
