import './styles/style.css'
import { mapsCatalog } from './config/mapsCatalog.js'
import { appState } from './state/appState.js'
import { CanvasManager } from './core/canvasManager.js'
import { MapSelector } from './components/MapSelector.js'
import { ContextMenu } from './components/ContextMenu.js'
import { ExportModal } from './components/ExportModal.js'
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

// Inicializar CanvasManager, Menú Contextual y Modal de Exportación
const canvasManager = new CanvasManager(editorContainer)
canvasManager.init()
new ContextMenu(canvasManager)
const exportModal = new ExportModal(canvasManager)

// --- INTERACTIVIDAD DEL PANEL LATERAL COLAPSABLE ---
closeSidebarBtn.addEventListener('click', () => {
  sidebar.classList.add('is-collapsed')
  toggleSidebarBtn.classList.remove('hidden')
  toggleSidebarBtn.setAttribute('aria-expanded', 'false')
  toggleSidebarBtn.focus()
})

toggleSidebarBtn.addEventListener('click', () => {
  sidebar.classList.remove('is-collapsed')
  toggleSidebarBtn.classList.add('hidden')
  toggleSidebarBtn.setAttribute('aria-expanded', 'true')
  closeSidebarBtn.focus()
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
  rect: document.getElementById('tool-rect'),
  circle: document.getElementById('tool-circle'),
  arrow: document.getElementById('tool-arrow'),
  text: document.getElementById('tool-text'),
  pin: document.getElementById('tool-pin'),
}

function updateActiveToolUI(activeTool) {
  Object.values(toolButtons).forEach(btn => {
    if (btn) btn.classList.remove('is-active')
  })
  if (toolButtons[activeTool]) {
    toolButtons[activeTool].classList.add('is-active')
  }
}

// Escuchar cambios de herramienta provocados internamente por CanvasManager
canvasManager.onToolChange = (activeTool) => {
  updateActiveToolUI(activeTool)
}

// Registrar eventos para la selección de cada herramienta
Object.entries(toolButtons).forEach(([toolName, btn]) => {
  if (btn) {
    btn.addEventListener('click', () => {
      canvasManager.setTool(toolName)
      updateActiveToolUI(toolName)
    })
  }
})

// Borrado de objetos y Limpieza
document.getElementById('tool-delete').addEventListener('click', () => {
  canvasManager.deleteSelected()
})

document.getElementById('tool-clear').addEventListener('click', () => {
  canvasManager.clearCanvas()
})

// Acciones de Zoom
document.getElementById('action-zoom-in')?.addEventListener('click', () => {
  canvasManager.zoomIn()
})

document.getElementById('action-zoom-out')?.addEventListener('click', () => {
  canvasManager.zoomOut()
})

document.getElementById('action-zoom-home')?.addEventListener('click', () => {
  canvasManager.zoomHome()
})

// --- INTERACTIVIDAD DEL PANEL DE ESTILOS Y COLORES ---
const colorChipsContainer = document.getElementById('color-chips-container')
const recentColorsContainer = document.getElementById('recent-colors-container')
const strokeSlider = document.getElementById('stroke-slider')
const strokeValueDisplay = document.getElementById('stroke-value-display')
const customColorPicker = document.getElementById('custom-color-picker')
const propertiesPanel = document.getElementById('properties-panel')
const togglePropertiesBtn = document.getElementById('toggle-properties-btn')

let customColors = [] // Almacena hasta 5 colores personalizados en HEX
let lastUsedColors = ['#faeb8b', '#82d3f8', '#7abe7d'] // 3 últimos colores utilizados

function selectColor(color, activeChip) {
  // Mantener histórico de los últimos 3 colores utilizados sin duplicados
  lastUsedColors = [color, ...lastUsedColors.filter((c) => c.toLowerCase() !== color.toLowerCase())].slice(0, 3)

  // Remover clase activa y actualizar aria-checked de todas las fichas
  document.querySelectorAll('.nbi-color-chip').forEach((c) => {
    c.classList.remove('is-active')
    c.setAttribute('aria-checked', 'false')
  })
  
  if (activeChip) {
    activeChip.classList.add('is-active')
    activeChip.setAttribute('aria-checked', 'true')
  }
  
  canvasManager.setActiveColor(color)
  renderRecentColors()
}

function renderRecentColors() {
  if (!recentColorsContainer) return
  recentColorsContainer.innerHTML = ''

  lastUsedColors.forEach((color) => {
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.role = 'radio'
    chip.className = 'nbi-color-chip'
    const isSelected = color.toLowerCase() === canvasManager.activeColor.toLowerCase()
    if (isSelected) {
      chip.classList.add('is-active')
    }
    chip.setAttribute('aria-checked', isSelected ? 'true' : 'false')
    chip.style.backgroundColor = color
    chip.setAttribute('data-color', color)
    chip.setAttribute('title', `Color reciente: ${color}`)
    chip.setAttribute('aria-label', `Color reciente ${color}`)

    chip.addEventListener('click', () => {
      selectColor(color, chip)
    })

    recentColorsContainer.appendChild(chip)
  })
}

// Colapsar y expandir el panel de propiedades (colores)
togglePropertiesBtn.addEventListener('click', () => {
  const isCollapsed = propertiesPanel.classList.toggle('is-collapsed')
  const icon = togglePropertiesBtn.querySelector('i')

  if (isCollapsed) {
    togglePropertiesBtn.setAttribute('title', 'Expandir Panel')
    togglePropertiesBtn.setAttribute('aria-label', 'Expandir panel de color')
    togglePropertiesBtn.setAttribute('aria-expanded', 'false')
    if (icon) icon.setAttribute('data-lucide', 'chevron-left')
    recentColorsContainer.classList.remove('hidden')
    renderRecentColors()
  } else {
    togglePropertiesBtn.setAttribute('title', 'Colapsar Panel')
    togglePropertiesBtn.setAttribute('aria-label', 'Colapsar panel de color')
    togglePropertiesBtn.setAttribute('aria-expanded', 'true')
    if (icon) icon.setAttribute('data-lucide', 'chevron-right')
    recentColorsContainer.classList.add('hidden')
  }

  if (window.lucide) {
    window.lucide.createIcons()
  }
})

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
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.role = 'radio'
    chip.setAttribute('aria-checked', 'false')
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
const toolStickersBtn = document.getElementById('tool-stickers')

function openStickersPanel() {
  stickersPanel.classList.remove('hidden')
  if (toolStickersBtn) {
    toolStickersBtn.classList.add('is-active')
    toolStickersBtn.setAttribute('aria-expanded', 'true')
  }
}

function closeStickersPanel() {
  stickersPanel.classList.add('hidden')
  if (toolStickersBtn) {
    toolStickersBtn.classList.remove('is-active')
    toolStickersBtn.setAttribute('aria-expanded', 'false')
    toolStickersBtn.focus()
  }
}

// Abrir/Cerrar panel de stickers desde la barra de herramientas
toolStickersBtn?.addEventListener('click', () => {
  if (stickersPanel.classList.contains('hidden')) {
    openStickersPanel()
  } else {
    closeStickersPanel()
  }
})

// Cerrar panel de stickers desde su propio botón Chevron Down
toggleStickersBtn?.addEventListener('click', () => {
  closeStickersPanel()
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

// --- ACCIONES DEL SISTEMA (IMPORTACIÓN DE IMAGEN Y DESCARGA DE PNG) ---
const importImageBtn = document.getElementById('action-import-image')
const imageFileInput = document.getElementById('image-file-input')

importImageBtn?.addEventListener('click', () => {
  imageFileInput?.click()
})

imageFileInput?.addEventListener('change', (e) => {
  const file = e.target.files?.[0]
  if (file) {
    canvasManager.addLocalImage(file)
    imageFileInput.value = ''
  }
})

document.getElementById('action-export')?.addEventListener('click', () => {
  exportModal.open()
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