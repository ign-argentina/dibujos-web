import './styles/style.css'
import { mapsCatalog } from './config/mapsCatalog.js'
import { appState } from './state/appState.js'
import { CanvasManager } from './core/canvasManager.js'

// Inicializar Lucide Icons
if (window.lucide) {
  window.lucide.createIcons()
}

// Obtener elementos de la UI
const editorContainer = document.getElementById('editor-container')
const sidebar = document.getElementById('sidebar-catalog')
const closeSidebarBtn = document.getElementById('close-sidebar-btn')
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn')
const cardsContainer = document.getElementById('map-cards-container')
const loaderOverlay = document.getElementById('loader-overlay')

if (!editorContainer) {
  throw new Error('No se encontró el elemento #editor-container')
}

// Inicializar CanvasManager
const canvasManager = new CanvasManager(editorContainer)
canvasManager.init()

// --- INTERACTIVIDAD DEL PANEL LATERAL COLAPSABLE ---
closeSidebarBtn.addEventListener('click', () => {
  sidebar.classList.add('is-collapsed')
  toggleSidebarBtn.classList.remove('hidden')
})

toggleSidebarBtn.addEventListener('click', () => {
  sidebar.classList.remove('is-collapsed')
  toggleSidebarBtn.classList.add('hidden')
})

// --- GENERACIÓN DINÁMICA DE TARJETAS DE PROVINCIAS ---
mapsCatalog.forEach((map) => {
  const card = document.createElement('div')
  card.className = 'nbi-map-card'
  card.id = `card-${map.id}`
  
  card.innerHTML = `
    <img class="nbi-map-card-image" src="${map.thumbnailUrl}" alt="${map.name}" />
    <div class="nbi-map-card-info">${map.name}</div>
  `
  
  // Sincronizar clic con el estado de la app
  card.addEventListener('click', () => {
    appState.setActiveMapId(map.id)
  })
  
  cardsContainer.appendChild(card)
})

// --- ESCUCHAR CAMBIOS EN EL ESTADO GLOBAL (REACTIVIDAD) ---
appState.subscribe(async (state) => {
  if (!state.activeMapId) return

  // 1. Actualizar clase activa en las tarjetas del catálogo
  document.querySelectorAll('.nbi-map-card').forEach((card) => {
    card.classList.remove('is-active')
  })
  
  const activeCard = document.getElementById(`card-${state.activeMapId}`)
  if (activeCard) {
    activeCard.classList.add('is-active')
  }
  
  // 2. Cargar el mapa en el Canvas con pantalla de carga juguetona
  const mapData = mapsCatalog.find((m) => m.id === state.activeMapId)
  if (mapData) {
    loaderOverlay.classList.remove('hidden')
    try {
      await canvasManager.loadMap(mapData.imageUrl)
    } catch (err) {
      console.error('Error cargando el mapa en el lienzo:', err)
    } finally {
      // Pequeño retraso intencional para suavizar el rebote del loader de NBI-DS
      setTimeout(() => {
        loaderOverlay.classList.add('hidden')
      }, 600)
    }
  }
})

// --- INICIALIZACIÓN DE LA APLICACIÓN ---
// Activar por defecto la primera provincia (Buenos Aires)
if (mapsCatalog.length > 0) {
  appState.setActiveMapId(mapsCatalog[0].id)
}