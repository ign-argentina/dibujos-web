/**
 * Definición declarativa del recorrido guiado general de la aplicación.
 * Diseñado con un enfoque estrictamente demostrativo para usuarios nuevos, docentes y estudiantes.
 */
export const generalTour = {
  id: 'general',
  version: 1,
  title: 'Recorrido General de Mapas Escolares',
  steps: [
    {
      id: 'welcome',
      target: '[data-tour="navbar"]',
      title: '¡Te damos la bienvenida a Mapas Escolares!',
      text: 'Esta aplicación te permite explorar mapas oficiales de la República Argentina y dibujar sobre ellos de forma sencilla.',
      placement: 'bottom'
    },
    {
      id: 'sidebar-maps',
      target: '[data-tour="sidebar-maps"]',
      title: 'Catálogo de mapas',
      text: 'Desde esta solapa podés abrir el catálogo para buscar y elegir mapas de provincias, regiones y del continente americano.',
      placement: 'right'
    },
    {
      id: 'canvas-area',
      target: '[data-tour="canvas-area"]',
      title: 'Área de dibujo',
      text: 'Este es tu espacio principal de trabajo, donde podés ver el mapa cargado, trazar recorridos, destacar zonas y colocar información.',
      placement: 'top'
    },
    {
      id: 'tools-navigation',
      target: '[data-tour="tools-navigation"]',
      title: 'Mover y seleccionar',
      text: 'La herramienta Mano permite desplazarte arrastrando el mapa. Con la herramienta de Selección podés mover, rotar y transformar los elementos dibujados.',
      placement: 'top'
    },
    {
      id: 'tool-brush',
      target: '[data-tour="tool-brush"]',
      title: 'Dibujo libre',
      text: 'El lápiz te permite realizar trazos a mano alzada para rodear regiones, marcar recorridos o escribir sobre el mapa.',
      placement: 'top'
    },
    {
      id: 'tools-shapes',
      target: '[data-tour="tools-shapes"]',
      title: 'Figuras y líneas',
      text: 'Este conjunto de herramientas incluye rectángulos, círculos, flechas, polilíneas y polígonos para agregar figuras geométricas con precisión.',
      placement: 'top'
    },
    {
      id: 'tools-annotations',
      target: '[data-tour="tools-annotations"]',
      title: 'Textos y marcadores',
      text: 'Con estas herramientas podés escribir nombres o referencias sobre el mapa y colocar pines o marcadores en puntos geográficos destacados.',
      placement: 'top'
    },
    {
      id: 'tool-stickers',
      target: '[data-tour="tool-stickers"]',
      title: 'Decoraciones y stickers',
      text: 'Este botón abre la galería de stickers y decoraciones temáticas para ilustrar y enriquecer tus mapas.',
      placement: 'top'
    },
    {
      id: 'properties-panel',
      target: '[data-tour="properties-panel"]',
      title: 'Pintura y trazo',
      text: 'En este panel podés elegir el color de dibujo de la paleta, seleccionar colores personalizados y graduar el grosor del lápiz.',
      placement: 'left'
    },
    {
      id: 'history-zoom-controls',
      target: '[data-tour="history-zoom-controls"]',
      title: 'Historial y zoom',
      text: 'Los botones de Deshacer y Rehacer permiten corregir cambios en el dibujo, mientras que los controles de lupa acercan, alejan o restablecen la vista del mapa.',
      placement: 'left'
    },
    {
      id: 'action-export',
      target: '[data-tour="action-export"]',
      title: 'Exportar e imprimir',
      text: 'Esta opción permite guardar tu trabajo como imagen (PNG o JPG) o generar un archivo PDF listo para imprimir en tamaño escolar.',
      placement: 'left'
    },
    {
      id: 'sidebar-tabs',
      target: '[data-tour="sidebar-tabs"]',
      title: 'Accesibilidad y Ayuda',
      text: 'En estas solapas podés configurar opciones visuales como contraste y tamaño de letra, o volver a iniciar este recorrido siempre que lo necesites.',
      placement: 'right'
    }
  ]
}
