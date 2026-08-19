# Arquitectura del Módulo de Ayuda y Recorrido Guiado (`help-tour`)

Este documento describe la arquitectura, principios de diseño, componentes y guías de extensibilidad del módulo de **Ayuda y Recorridos Guiados Interactivos** implementado en la aplicación Mapas Escolares.

---

## 1. Visión General y Principios de Diseño

El módulo está diseñado específicamente para este repositorio respetando los siguientes pilares:

1. **Enfoque Estrictamente Demostrativo**: El recorrido tiene fines pedagógicos e informativos. No requiere ni simula clics forzados sobre el lienzo de Fabric.js o las herramientas durante el recorrido.
2. **Inmunidad e Integridad de Datos**: El backdrop y la máscara SVG bloquean el 100% de las interacciones con el lienzo y controles subyacentes durante el tour, evitando trazos accidentales o mutaciones en `HistoryManager`.
3. **Desacoplamiento y Modularidad**: La lógica se divide en capas con responsabilidades únicas: definición declarativa de datos, resolución de elementos en DOM, cálculo matemático puro de posicionamiento, renderizado visual accesible y orquestación del ciclo de vida.
4. **Accesibilidad Integral**:
   - Diálogos modales con roles y etiquetas ARIA estándar (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`).
   - Ciclo de foco estrictamente contenido (*Focus Trap*) con `Tab` y `Shift+Tab`.
   - Navegación ágil por teclado (`Escape` para cerrar, `ArrowRight` para avanzar, `ArrowLeft` para retroceder).
   - Anunciador en vivo (`aria-live="polite"`) para lectores de pantalla.
   - Respeto del modo de reducción de movimiento (*Reduced Motion*) tanto a nivel de sistema operativo como en las preferencias de accesibilidad de la app.
5. **Estética Neo-Brutalista**: Utiliza los tokens de diseño NBI (`--nbi-border-width-md`, `--nbi-shadow-lg`, `--nbi-color-accent`, etc.).

---

## 2. Mapa de Componentes y Responsabilidades

```
src/features/help-tour/
├── tours/
│   └── generalTour.js           # Definición declarativa del recorrido general
├── StepResolver.js              # Resolución inmutable de selectores y dimensiones DOM
├── Positioning.js               # Motor matemático puro de posicionamiento y colisiones
├── TourOverlay.js               # Capa visual (Backdrop, SVG mask spotlight, Tooltip accesible)
├── TourController.js            # Orquestador del ciclo de vida, navegación y restauración
├── TourStorage.js               # Persistencia de versiones completadas y avisos
├── TourWelcomeModal.js          # Modal accesible de bienvenida / invitación inicial
└── __tests__/                   # Suites completas de pruebas unitarias e integración
```

### 2.1 `HelpPanel` (`src/components/HelpPanel.js`)
Componente que renderiza la tercera solapa del Sidebar ("Ayuda"). Presenta la tarjeta introductoria y el botón *"Iniciar recorrido"*, el cual siempre ejecuta el tour desde el **Paso 1**.

### 2.2 `generalTour` (`src/features/help-tour/tours/generalTour.js`)
Objeto declarativo inmutable que define la metadata del tour (`id`, `version`, `title`) y el array de pasos ordenados con sus selectores semánticos (`target: '[data-tour="..."]'`), títulos, textos descriptivos y ubicaciones preferidas (`placement: 'bottom' | 'top' | 'left' | 'right'`).

### 2.3 `StepResolver` (`src/features/help-tour/StepResolver.js`)
Servicio puro que localiza elementos en el DOM mediante selectores primarios (`data-tour`) o mapa de respaldo (`DEFAULT_FALLBACK_MAP`). Comprueba que el elemento posea dimensiones reales (`width > 0 || height > 0`). Si el elemento no existe o está oculto, permite al controlador omitirlo (*skip*) de forma segura sin excepciones.

### 2.4 `Positioning` (`src/features/help-tour/Positioning.js`)
Módulo matemático puro. Calcula las coordenadas `(x, y)` del tooltip y la flecha respecto al bounding rect del target y las dimensiones del viewport. Si la posición preferida desborda la pantalla, evalúa el orden de fallback automático y aplica *clamping* contra los márgenes del viewport.

### 2.5 `TourOverlay` (`src/features/help-tour/TourOverlay.js`)
Componente visual que hereda de `Component`. Inyecta:
- Una máscara SVG de pantalla completa que oscurece la aplicación y recorta con bordes redondeados el elemento resaltado.
- Un marco exterior Neo-Brutalista sobre el target.
- Una ventana flotante (*tooltip*) con el badge de progreso (`Paso X de N`), título, descripción, botón de cierre y botones de navegación (*Anterior*, *Siguiente*, *Finalizar*).
- Anunciador de accesibilidad y manejadores de *Focus Trap*.

### 2.6 `TourController` (`src/features/help-tour/TourController.js`)
Orquestador del ciclo de vida.
- **Snapshot previo**: Guarda el elemento desencadenante, la herramienta activa de dibujo y el estado/vista del Sidebar.
- **Suspensión**: Desactiva herramientas de dibujo interactivas cambiando temporalmente a `'pan'`.
- **Navegación**: Gestiona `next()`, `prev()`, `finish()`, `close()`, saltando automáticamente pasos con targets no disponibles en el DOM.
- **Restauración**: Restaura la herramienta previa, la vista y estado del Sidebar, y el foco del usuario.

### 2.7 `TourStorage` (`src/features/help-tour/TourStorage.js`)
Capa de persistencia sobre `PersistenceService` (clave `ign_tour_settings`). Almacena de forma independiente:
- `completedVersion`: Versión máxima finalizada por el usuario.
- `dismissedAutoPromptVersion`: Versión máxima en la que el usuario marcó *"No volver a mostrar"*.

### 2.8 `TourWelcomeModal` (`src/features/help-tour/TourWelcomeModal.js`)
Modal accesible desplegado en el primer arranque de la aplicación (si no fue completado ni descartado previamente). Ofrece iniciar el recorrido, posponerlo (*"Ahora no"*) o desactivar el aviso futuro (*"No volver a mostrar"*).

---

## 3. Secuencia del Recorrido General (12 Pasos)

| # | ID del Paso | Selector Target | Posición | Contenido Resumido |
| :-: | :--- | :--- | :-: | :--- |
| **1** | `welcome` | `[data-tour="navbar"]` | `bottom` | Bienvenida e identidad de la app. |
| **2** | `sidebar-maps` | `[data-tour="sidebar-maps"]` | `right` | Catálogo de mapas oficiales de provincias y regiones. |
| **3** | `canvas-area` | `[data-tour="canvas-area"]` | `top` | Espacio principal de dibujo y trabajo sobre el mapa. |
| **4** | `tools-navigation` | `[data-tour="tools-navigation"]` | `top` | Herramientas Mano (paneo) y Selección (transformación). |
| **5** | `tool-brush` | `[data-tour="tool-brush"]` | `top` | Lápiz para trazos libres a mano alzada. |
| **6** | `tools-shapes` | `[data-tour="tools-shapes"]` | `top` | Figuras geométricas: rectángulos, círculos, flechas, etc. |
| **7** | `tools-annotations` | `[data-tour="tools-annotations"]` | `top` | Herramientas de texto y pines/marcadores geográficos. |
| **8** | `tool-stickers` | `[data-tour="tool-stickers"]` | `top` | Galería de stickers y decoraciones temáticas. |
| **9** | `properties-panel` | `[data-tour="properties-panel"]` | `left` | Panel de selección de color y grosor de trazo. |
| **10** | `history-zoom-controls` | `[data-tour="history-zoom-controls"]` | `left` | Botones Deshacer/Rehacer y lupas de zoom. |
| **11** | `action-export` | `[data-tour="action-export"]` | `left` | Opciones de guardado como imagen o exportación a PDF. |
| **12** | `sidebar-tabs` | `[data-tour="sidebar-tabs"]` | `right` | Solapas de Accesibilidad y Ayuda para reiniciar el tour. |

---

## 4. Guía de Extensibilidad

### 4.1 Cómo agregar un nuevo Step a un Tour existente

1. **Definir el target en el HTML o Componente**:
   Asignar el atributo semántico `data-tour="mi-nuevo-target"` en el elemento HTML correspondiente.
2. **Agregar el paso en el archivo del tour** (ej. `generalTour.js`):
   ```javascript
   {
     id: 'mi-nuevo-paso',
     target: '[data-tour="mi-nuevo-target"]',
     title: 'Título Demostrativo',
     text: 'Descripción en tono explicativo sobre la funcionalidad.',
     placement: 'bottom' // 'top' | 'bottom' | 'left' | 'right'
   }
   ```
3. **Opcional: Agregar fallback en `StepResolver.js`**:
   Si el elemento tiene un ID histórico de respaldo:
   ```javascript
   export const DEFAULT_FALLBACK_MAP = {
     // ...
     '[data-tour="mi-nuevo-target"]': '#mi-elemento-id'
   }
   ```

### 4.2 Cómo agregar un Tour Futuro (ej. `drawingTour`, `mapsTour`, `accessibilityTour`)

1. **Crear la definición del tour** en `src/features/help-tour/tours/drawingTour.js`:
   ```javascript
   export const drawingTour = {
     id: 'drawing',
     version: 1,
     title: 'Recorrido de Herramientas de Dibujo',
     steps: [
       // Lista de pasos...
     ]
   }
   ```
2. **Ejecutar el nuevo tour desde cualquier componente o botón**:
   ```javascript
   tourController.start(drawingTour, triggerButtonElement)
   ```
3. **Persistencia automática**:
   `TourStorage` ya incluye soporte estructurado para `drawing`, `maps` y `accessibility`. Al finalizar o descartar, el progreso se guardará automáticamente bajo su respectivo `id`.
