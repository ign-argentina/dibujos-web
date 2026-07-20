import './styles/style.css'
import { mapsCatalog } from './config/mapsCatalog.js'
import { appState } from './state/appState.js'
import { CanvasManager } from './core/canvasManager.js'
import { MapSelector } from './components/MapSelector.js'
import { stickersCatalog } from './config/stickersCatalog.js'

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

// --- INICIALIZACIÓN DEL SELECTOR DE MAPAS MODULARIZADO ---
new MapSelector(sidebar, cardsContainer)

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

  // 2. La clase activa se actualiza automáticamente a través de la suscripción dentro de MapSelector
  
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

document.getElementById('tool-pin').addEventListener('click', () => {
  canvasManager.addPin()
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
const colorChipsContainer = document.getElementById('color-chips-container')
const strokeSlider = document.getElementById('stroke-slider')
const strokeValueDisplay = document.getElementById('stroke-value-display')
const customColorPicker = document.getElementById('custom-color-picker')

let customColors = [] // Almacena hasta 5 colores personalizados en HEX

function selectColor(color, activeChip) {
  // Remover clase activa de todos los chips existentes
  colorChipsContainer.querySelectorAll('.nbi-color-chip').forEach((c) => {
    c.classList.remove('is-active')
  })
  
  if (activeChip) {
    activeChip.classList.add('is-active')
  }
  
  canvasManager.setActiveColor(color)
}

// Delegación de eventos en el contenedor de chips
colorChipsContainer.addEventListener('click', (e) => {
  const chip = e.target.closest('.nbi-color-chip')
  if (chip) {
    const color = chip.getAttribute('data-color')
    selectColor(color, chip)
  }
})

// Al cambiar el color en el picker nativo
customColorPicker.addEventListener('change', (e) => {
  const hexColor = e.target.value.toUpperCase()

  // Si ya existía, lo quitamos de la lista para empujarlo al final (el más reciente)
  customColors = customColors.filter((c) => c !== hexColor)
  customColors.push(hexColor)

  // Mantener como máximo 5 colores personalizados
  if (customColors.length > 5) {
    customColors.shift()
  }

  // Volver a renderizar chips personalizados
  renderCustomChips()

  // Seleccionar la ficha recién creada
  const targetChip = colorChipsContainer.querySelector(`.nbi-color-chip[data-color="${hexColor}"]`)
  selectColor(hexColor, targetChip)
})

function renderCustomChips() {
  // Eliminar fichas personalizadas anteriores
  colorChipsContainer.querySelectorAll('.nbi-color-chip.is-custom-chip').forEach((c) => c.remove())

  // Insertar antes de la ficha negra (#000000)
  const blackChip = colorChipsContainer.querySelector('.nbi-color-chip[data-color="#000000"]')
  
  customColors.forEach((color) => {
    const chip = document.createElement('div')
    chip.className = 'nbi-color-chip is-custom-chip'
    chip.style.backgroundColor = color
    chip.setAttribute('data-color', color)
    chip.setAttribute('title', `Personalizado: ${color}`)
    chip.setAttribute('aria-label', `Color personalizado ${color}`)
    
    if (blackChip) {
      colorChipsContainer.insertBefore(chip, blackChip)
    } else {
      colorChipsContainer.appendChild(chip)
    }
  })
}

// Cambiar grosor de trazo
strokeSlider.addEventListener('input', (e) => {
  const width = e.target.value
  strokeValueDisplay.textContent = `${width}px`
  canvasManager.setActiveStrokeWidth(width)
})

// --- INTERACTIVIDAD Y GENERACIÓN DEL PANEL DE STICKERS ---
const stickersContainer = document.getElementById('stickers-container')
const stickersPanel = document.getElementById('stickers-panel')
const toggleStickersBtn = document.getElementById('toggle-stickers-btn')

// Colapsar / expandir el panel
toggleStickersBtn.addEventListener('click', () => {
  stickersPanel.classList.toggle('is-collapsed')
  const icon = toggleStickersBtn.querySelector('i')
  if (stickersPanel.classList.contains('is-collapsed')) {
    toggleStickersBtn.setAttribute('title', 'Expandir Panel')
    toggleStickersBtn.setAttribute('aria-label', 'Expandir panel de stickers')
    if (icon) {
      icon.setAttribute('data-lucide', 'chevron-up')
    }
  } else {
    toggleStickersBtn.setAttribute('title', 'Colapsar Panel')
    toggleStickersBtn.setAttribute('aria-label', 'Colapsar panel de stickers')
    if (icon) {
      icon.setAttribute('data-lucide', 'chevron-down')
    }
  }
  if (window.lucide) {
    window.lucide.createIcons()
  }
})

// Generar stickers dinámicamente
stickersCatalog.forEach((name) => {
  const item = document.createElement('button')
  item.className = 'nbi-sticker-item'
  item.setAttribute('title', `Agregar sticker de ${name.replace(/-/g, ' ')}`)
  item.setAttribute('aria-label', `Agregar sticker de ${name.replace(/-/g, ' ')}`)
  
  const img = document.createElement('img')
  img.src = `/stickers/${name}.svg`
  img.alt = name
  img.className = 'nbi-sticker-img'
  img.setAttribute('loading', 'lazy')
  
  item.appendChild(img)
  
  item.addEventListener('click', () => {
    canvasManager.addSticker(`/stickers/${name}.svg`)
  })
  
  stickersContainer.appendChild(item)
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