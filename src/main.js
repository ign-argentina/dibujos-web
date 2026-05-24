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

// --- ESCUCHAR CAMBIOS EN EL ESTADO GLOBAL (REACTIVIDAD Y PERSISTENCIA) ---
let previousMapId = null

function saveDrawingState() {
  const currentMapId = appState.getActiveMapId()
  if (currentMapId && canvasManager.canvas) {
    const jsonString = canvasManager.serialize()
    if (jsonString) {
      localStorage.setItem(`drawing_${currentMapId}`, jsonString)
    } else {
      localStorage.removeItem(`drawing_${currentMapId}`)
    }
  }
}

appState.subscribe(async (state) => {
  if (!state.activeMapId) return

  // 1. Guardar el estado del dibujo de la provincia anterior
  if (previousMapId && previousMapId !== state.activeMapId) {
    const prevJson = canvasManager.serialize()
    if (prevJson) {
      localStorage.setItem(`drawing_${previousMapId}`, prevJson)
    } else {
      localStorage.removeItem(`drawing_${previousMapId}`)
    }
  }
  
  // Actualizar el ID previo para la próxima iteración
  previousMapId = state.activeMapId

  // 2. Actualizar clase activa en las tarjetas del catálogo
  document.querySelectorAll('.nbi-map-card').forEach((card) => {
    card.classList.remove('is-active')
  })
  
  const activeCard = document.getElementById(`card-${state.activeMapId}`)
  if (activeCard) {
    activeCard.classList.add('is-active')
  }
  
  // 3. Limpiar dibujos transitorios antes de cargar el nuevo mapa
  canvasManager.clearCanvas()
  
  // 4. Cargar el mapa en el Canvas con pantalla de carga juguetona
  const mapData = mapsCatalog.find((m) => m.id === state.activeMapId)
  if (mapData) {
    loaderOverlay.classList.remove('hidden')
    try {
      await canvasManager.loadMap(mapData.imageUrl)
      
      // 5. Cargar dibujos guardados de la provincia activa (si existen)
      const savedJson = localStorage.getItem(`drawing_${state.activeMapId}`)
      if (savedJson) {
        await canvasManager.deserialize(savedJson)
      }
    } catch (err) {
      console.error('Error cargando el mapa en el lienzo:', err)
    } finally {
      // Pequeño retraso intencional para la física del loader de NBI-DS
      setTimeout(() => {
        loaderOverlay.classList.add('hidden')
      }, 600)
    }
  }
})

// Suscribirse a eventos del canvas para autoguardado en tiempo real
if (canvasManager.canvas) {
  canvasManager.canvas.on('object:added', saveDrawingState)
  canvasManager.canvas.on('object:modified', saveDrawingState)
  canvasManager.canvas.on('object:removed', saveDrawingState)
}

// --- INTERACTIVIDAD DE LA BARRA DE HERRAMIENTAS DE DIBUJO ---
const toolButtons = {
  select: document.getElementById('tool-select'),
  brush: document.getElementById('tool-brush'),
}

function updateActiveToolUI(activeTool) {
  Object.values(toolButtons).forEach(btn => btn.classList.remove('is-active'))
  if (toolButtons[activeTool]) {
    toolButtons[activeTool].classList.add('is-active')
  }
}

// Alternar entre Selección (Puntero) y Dibujo Libre (Lápiz)
toolButtons.select.addEventListener('click', () => {
  canvasManager.setTool('select')
  updateActiveToolUI('select')
})

toolButtons.brush.addEventListener('click', () => {
  canvasManager.setTool('brush')
  updateActiveToolUI('brush')
})

// Inserción dinámica de formas (y auto-retorno al puntero de selección)
document.getElementById('tool-rect').addEventListener('click', () => {
  canvasManager.addRect()
  canvasManager.setTool('select')
  updateActiveToolUI('select')
})

document.getElementById('tool-circle').addEventListener('click', () => {
  canvasManager.addCircle()
  canvasManager.setTool('select')
  updateActiveToolUI('select')
})

document.getElementById('tool-arrow').addEventListener('click', () => {
  canvasManager.addArrow()
  canvasManager.setTool('select')
  updateActiveToolUI('select')
})

document.getElementById('tool-text').addEventListener('click', () => {
  canvasManager.addText()
  canvasManager.setTool('select')
  updateActiveToolUI('select')
})

// Borrado de objetos y Limpieza
document.getElementById('tool-delete').addEventListener('click', () => {
  canvasManager.deleteSelected()
})

document.getElementById('tool-clear').addEventListener('click', () => {
  canvasManager.clearCanvas()
})

// --- INTERACTIVIDAD DEL PANEL DE ESTILOS ---
const colorChips = document.querySelectorAll('.nbi-color-chip')
const strokeSlider = document.getElementById('stroke-slider')
const strokeValueDisplay = document.getElementById('stroke-value-display')

// Cambiar color
colorChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    colorChips.forEach((c) => c.classList.remove('is-active'))
    chip.classList.add('is-active')
    
    const selectedColor = chip.getAttribute('data-color')
    canvasManager.setActiveColor(selectedColor)
  })
})

// Cambiar grosor de trazo
strokeSlider.addEventListener('input', (e) => {
  const width = e.target.value
  strokeValueDisplay.textContent = `${width}px`
  canvasManager.setActiveStrokeWidth(width)
})

// --- ACCIONES DEL SISTEMA (DESCARGA DE PNG) ---
document.getElementById('action-export').addEventListener('click', () => {
  const currentMapId = appState.getActiveMapId()
  const mapData = mapsCatalog.find((m) => m.id === currentMapId)
  const name = mapData ? mapData.name.replace(/\s+/g, '_') : 'mapa'
  canvasManager.exportToPNG(`mapa_${name}_anotado.png`)
})

// --- INICIALIZACIÓN DE LA APLICACIÓN ---
// Refrescar iconos cargados dinámicamente por si acaso
if (window.lucide) {
  window.lucide.createIcons()
}

// Activar por defecto la primera provincia (Buenos Aires)
if (mapsCatalog.length > 0) {
  appState.setActiveMapId(mapsCatalog[0].id)
}