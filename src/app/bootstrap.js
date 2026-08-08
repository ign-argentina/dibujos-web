import { appStore } from '../state/AppStore.js'
import { CanvasManager } from '../core/canvasManager.js'
import { persistenceService } from '../core/persistence/PersistenceService.js'
import { MapSelector } from '../components/MapSelector.js'
import { ContextMenu } from '../features/context-menu/ContextMenu.js'
import { ExportModal } from '../features/export-modal/ExportModal.js'
import { Toolbar } from '../features/toolbar/Toolbar.js'
import { ColorPalette } from '../features/color-palette/ColorPalette.js'
import { StickersPanel } from '../features/stickers-panel/StickersPanel.js'
import { configRepository } from '../core/repositories/ConfigRepository.js'
import { mapRepository } from '../core/repositories/MapRepository.js'

/**
 * Inicializa y configura todas las capas y componentes de la aplicación.
 * Realiza la inyección de dependencias y personalizaciones dinámicas desde config.json.
 */
export async function bootstrap() {
  if (window.lucide) {
    window.lucide.createIcons()
  }

  // Obtener elementos fundamentales de la UI
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
    toggleSidebarBtn.setAttribute('aria-expanded', 'false')
    toggleSidebarBtn.focus()
  })

  toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.remove('is-collapsed')
    toggleSidebarBtn.classList.add('hidden')
    toggleSidebarBtn.setAttribute('aria-expanded', 'true')
    closeSidebarBtn.focus()
  })

  // --- ESCUCHAR CAMBIOS EN EL ESTADO GLOBAL (REACTIVIDAD Y PERSISTENCIA) ---
  let previousMapId = null

  function saveDrawingState(immediate = false) {
    const currentMapId = appStore.getState().activeMapId
    if (currentMapId && canvasManager.canvas) {
      const jsonString = canvasManager.serialize()
      if (jsonString) {
        if (immediate) {
          persistenceService.save(`drawing_${currentMapId}`, jsonString)
        } else {
          persistenceService.saveDebounced(`drawing_${currentMapId}`, jsonString)
        }
      } else {
        persistenceService.remove(`drawing_${currentMapId}`)
      }
    }
  }

  appStore.subscribe(async (state) => {
    if (!state.activeMapId) return

    // 1. Guardar el estado del dibujo de la provincia anterior inmediatamente al cambiar
    if (previousMapId && previousMapId !== state.activeMapId) {
      const prevJson = canvasManager.serialize()
      if (prevJson) {
        persistenceService.save(`drawing_${previousMapId}`, prevJson)
      } else {
        persistenceService.remove(`drawing_${previousMapId}`)
      }
    }

    // Actualizar el ID previo para la próxima iteración
    previousMapId = state.activeMapId

    // 2. Limpiar dibujos transitorios antes de cargar el nuevo mapa
    canvasManager.clearCanvas()

    // 3. Cargar el mapa en el Canvas
    const mapData = await mapRepository.getById(state.activeMapId)
    if (mapData) {
      loaderOverlay.classList.remove('hidden')
      try {
        const mapSource = configRepository.getMapImageSource()
        const mapUrl =
          mapSource === 'imagePath'
            ? mapData.imagePath
              ? `${import.meta.env.BASE_URL.replace(/\/$/, '')}${mapData.imagePath}`
              : mapData.imageUrl
            : mapData.imageUrl || `${import.meta.env.BASE_URL.replace(/\/$/, '')}${mapData.imagePath}`
        await canvasManager.loadMap(mapUrl)

        // 4. Cargar dibujos guardados de la provincia activa (si existen)
        const savedJson = persistenceService.load(`drawing_${state.activeMapId}`)
        await canvasManager.deserialize(savedJson)

        // Inicializar el historial para el nuevo mapa
        canvasManager.historyManager.clear()
        canvasManager.historyManager.capture()
      } catch (err) {
        console.error('Error cargando el mapa en el lienzo:', err)
      } finally {
        setTimeout(() => {
          loaderOverlay.classList.add('hidden')
        }, 600)
      }
    }
  })

  // Suscribirse a eventos del canvas para autoguardado en tiempo real
  if (canvasManager.canvas) {
    canvasManager.canvas.on('object:added', () => {
      if (!canvasManager.isRestoringHistory) saveDrawingState(false)
    })
    canvasManager.canvas.on('object:modified', () => {
      if (!canvasManager.isRestoringHistory) saveDrawingState(false)
    })
    canvasManager.canvas.on('object:removed', () => {
      if (!canvasManager.isRestoringHistory) saveDrawingState(false)
    })
    canvasManager.canvas.on('history:restored', () => {
      saveDrawingState(true)
    })
  }

  // --- ACCIONES DEL SISTEMA (IMPORTACIÓN DE IMAGEN) ---
  const importImageBtn = document.getElementById('action-import-image')
  const imageFileInput = document.getElementById('image-file-input')

  importImageBtn?.addEventListener('click', () => {
    imageFileInput?.click()
  })

  imageFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        await canvasManager.addLocalImage(file)
      } catch (err) {
        if (err.message === 'FILE_TOO_LARGE') {
          alert('El archivo seleccionado supera el límite de 10 MB. Por favor, elige una imagen más liviana.')
        } else {
          alert('No se pudo cargar la imagen. Es posible que el archivo esté dañado o tenga un formato no compatible.')
        }
      } finally {
        imageFileInput.value = ''
      }
    }
  })

  // --- INICIALIZACIÓN ASÍNCRONA DE CONFIGURACIÓN Y COMPONENTES ---
  loaderOverlay.classList.remove('hidden')
  try {
    // 1. Cargar la configuración remota JSON
    await configRepository.load()
    const uiConfig = configRepository.getUiConfig()

    // Cargar dinámicamente custom.css o el fallback default/custom.css
    const cssLink = document.createElement('link')
    cssLink.rel = 'stylesheet'
    const customCssUrl = `${import.meta.env.BASE_URL}config/custom.css`
    const defaultCssUrl = `${import.meta.env.BASE_URL}config/default/custom.css`
    try {
      const resp = await fetch(customCssUrl, { method: 'HEAD' })
      if (resp.ok) {
        cssLink.href = customCssUrl
      } else {
        cssLink.href = defaultCssUrl
      }
    } catch {
      cssLink.href = defaultCssUrl
    }
    document.head.appendChild(cssLink)

    // Inyectar paleta de colores del tema en variables CSS del :root
    if (uiConfig.theme) {
      const themeStyle = document.createElement('style')
      themeStyle.id = 'nbi-dynamic-theme-style'
      themeStyle.innerHTML = `
        :root {
          --nbi-bg-main: ${uiConfig.theme.background || '#FAFAFA'};
          --nbi-primary-color: ${uiConfig.theme.primary || '#41C0F0'};
          --nbi-secondary-color: ${uiConfig.theme.secondary || '#9678ce'};
          --nbi-accent-color: ${uiConfig.theme.accent || '#EEC461'};
          --nbi-text-color: ${uiConfig.theme.text || '#000000'};
          --nbi-icons-color: ${uiConfig.theme.icons || '#757575'};
          --nbi-success-color: ${uiConfig.theme.success || '#00B2BB'};
          --nbi-danger-color: ${uiConfig.theme.danger || '#EB5E50'};
          --nbi-color-panel-bg: ${uiConfig.theme.panelBackground || '#ebebeb'};
        }
      `
      document.head.appendChild(themeStyle)
    }

    // 2. Personalización dinámica de la interfaz desde config.json
    const headerTitle = document.querySelector('.nbi-navbar__title')
    if (headerTitle && uiConfig.title) {
      headerTitle.textContent = uiConfig.title
    }

    const headerLogo = document.querySelector('.nbi-navbar__logo')
    if (headerLogo && uiConfig.logoUrl) {
      headerLogo.src = `${import.meta.env.BASE_URL.replace(/\/$/, '')}${uiConfig.logoUrl}`
    }

    const logoLink = document.getElementById('logo-link')
    if (logoLink && uiConfig.logoLink) {
      logoLink.href = uiConfig.logoLink
    }

    const externalLink = document.getElementById('ign-link-btn')
    if (externalLink && uiConfig.externalLink) {
      if (uiConfig.externalLink.visible === false) {
        externalLink.classList.add('hidden')
      } else {
        externalLink.classList.remove('hidden')
        externalLink.href =
          uiConfig.externalLink.href ||
          'https://www.ign.gob.ar/AreaServicios/Descargas/MapasEscolares'
        const spanText = externalLink.querySelector('.btn-text')
        if (spanText) {
          spanText.textContent = uiConfig.externalLink.text || 'Descargar Mapas Oficiales'
        }
      }
    }



    // 3. Inicializar y montar componentes UI modulares
    const toolbar = new Toolbar(document.getElementById('toolbar-container') || editorContainer, {
      canvasManager,
    })
    toolbar.mount()

    const colorPalette = new ColorPalette(
      document.getElementById('properties-panel') || editorContainer,
      { canvasManager }
    )
    colorPalette.mount()

    const stickersPanel = new StickersPanel(
      document.getElementById('stickers-panel') || editorContainer,
      { canvasManager }
    )
    await stickersPanel.render()
    stickersPanel.bindEvents()

    new ContextMenu(canvasManager)

    const exportModal = new ExportModal(canvasManager, mapRepository)
    document.getElementById('action-export')?.addEventListener('click', () => {
      exportModal.open()
    })

    // 4. Inicializar selector de mapas modularizado
    const mapSelector = new MapSelector(sidebar, cardsContainer, mapRepository)
    await mapSelector.init()

    if (window.lucide) {
      window.lucide.createIcons()
    }

    // 5. Activar por defecto la primera provincia del catálogo
    const maps = await mapRepository.getAll()
    if (maps.length > 0) {
      appStore.dispatch({ type: 'SET_ACTIVE_MAP_ID', payload: maps[0].id })
    }
  } catch (err) {
    console.error('Error al inicializar la aplicación:', err)
  } finally {
    loaderOverlay.classList.add('hidden')
  }
}
