# Dibujos Web - Módulo de Accesibilidad y Arquitectura

Esta aplicación es una Single Page Application (SPA) modular estructurada con JavaScript Vanilla, Vite, Fabric.js y un sistema de diseño brutalista. Este documento describe la arquitectura técnica del nuevo **Módulo de Accesibilidad** y los lineamientos de extensión del proyecto.

---

## 1. Arquitectura General y Flujo de Accesibilidad

El módulo de accesibilidad se integra de manera desacoplada con el flujo reactivo y el estado centralizado del proyecto:

```
[ Control UI (AccessibilityPanel) ]
             ↓ (dispatch)
      [ AppStore.js ] (Validación + Compatibilidad + Persistencia)
             ↓ (subscribe)
  [ AccessibilityManager.js ]
             ↓ (setAttributes)
       [ DOM (<html>) ]
             ↓
        [ CSS Rules ] ──(Filtros/Variables)──> [ Fabric.js Canvas / UI ]
```

1. **AccessibilityPanel**: Componente visual que expone los interruptores y controles segmentados. No almacena estado local; despacha acciones directas al store.
2. **AppStore**: Actúa como la única fuente de verdad. Valida los valores, ejecuta reglas de exclusión y guarda el estado en disco de forma síncrona.
3. **AccessibilityManager**: Observa reactivamente el store y traduce los valores en atributos de datos (`data-*`) sobre la etiqueta raíz `<html>`.
4. **CSS & Themes**: Aplica transformaciones visuales globales y locales (escalado de texto, interlineado, alto contraste, reducción de movimiento) basadas en selectores de atributos en CSS, interactuando nativamente con el Canvas y controles de UI.

---

## 2. Componentes Clave

### A. Store y Persistencia (`AppStore.js`)
* **Estado Versionado**: Las preferencias se guardan en `localStorage` bajo la clave `ign_accessibility_settings` en un JSON con formato `{ version: 1, settings: { ... } }`.
* **Resiliencia**: En el constructor se verifica la validez de los datos recuperados. Si el JSON está corrupto o se alteran los valores del almacenamiento externamente, el store recupera los valores seguros por defecto (`DEFAULT_ACCESSIBILITY`) para evitar flashes o bloqueos de renderizado.
* **Reglas de Compatibilidad**: Centralizadas en `applyCompatibilityRules()`. La última elección ingresada por el usuario tiene prioridad. Las exclusiones activas son:
  * *Inversión*: Desactiva escala de grises y daltonismo.
  * *Escala de grises*: Desactiva inversión, contraste y daltonismo.
  * *Daltonismo*: Desactiva inversión y escala de grises.
  * *Alto Contraste*: Desactiva escala de grises.

### B. Manager Reactivo (`AccessibilityManager.js`)
* Realiza la sincronización de las preferencias del Store hacia el DOM.
* Mapea el triestado de `reducedMotion` (`system`, `enabled`, `disabled`).

### C. Sidebar de Solapas Extensible (`Sidebar.js`)
* Abstracción modular que hereda de la clase base `Component`.
* Renderiza pestañas verticales externas en el lateral derecho (`role="tablist"` / `role="tab"`).
* Controla las transiciones CSS de apertura/colapso (`transform: translateX(-320px)`) para mantener visibles las solapas en todo momento.
* Maneja atajos de teclado de navegación interna (Flechas de dirección para alternar foco entre solapas) y restaura el foco a la solapa activa cuando el panel se colapsa.

### D. Panel de Controles (`AccessibilityPanel.js`)
* Componente modular que se inyecta en la pestaña correspondiente.
* **Switches**: Botones con `role="switch"` y `aria-checked` para alternar configuraciones binarias.
* **Controles Segmentados**: Elementos `<input type="radio">` nativos agrupados bajo un contenedor común (`role="radiogroup"`). Esto permite que el navegador controle de manera estándar el foco y teclado sin incurrir en trampas de accesibilidad.

---

## 3. Guía de Extensión y Procedimientos

### Cómo agregar una nueva preferencia de accesibilidad

Si deseas agregar una nueva preferencia (ej: `myFeature`), sigue estos pasos:

1. **Actualizar el Store (`src/state/AppStore.js`)**:
   * Agrega el valor por defecto en el objeto `DEFAULT_ACCESSIBILITY`:
     ```javascript
     myFeature: 'default', // o false
     ```
   * En `dispatch` (caso `SET_ACCESSIBILITY_PREFERENCE`) y en `validateAndMigrateSettings()`, agrega las validaciones permitidas:
     ```javascript
     myFeature: ['default', 'value1', 'value2'] // o [true, false]
     ```
   * Si entra en conflicto con otras opciones, añade la lógica correspondiente en `applyCompatibilityRules(settings, updatedKey)`.

2. **Actualizar el Manager (`src/core/accessibility/AccessibilityManager.js`)**:
   * Añade el mapeo al atributo del elemento raíz en `applyPreferences(accessibility)`:
     ```javascript
     html.setAttribute('data-my-feature', accessibility.myFeature || 'default')
     ```

3. **Definir el Estilo en CSS (`src/styles/themes/accessibility.css`)**:
   * Escribe las reglas correspondientes basadas en el atributo:
     ```css
     html[data-my-feature="value1"] .elemento {
       /* tus estilos */
     }
     ```

4. **Incorporar el Control UI (`src/components/AccessibilityPanel.js`)**:
   * Añade el HTML (radio group o switch) en el método `render()`. Asegúrate de usar atributos ARIA coherentes.
   * Si es un switch, agrégalo a la lista `switches` en `bindEvents()` y `updateControls()`.
   * Si es un control segmentado (radio), agrégalo a la lista `radioKeys` en `bindEvents()` y `updateControls()`.

---

### Cómo agregar una nueva solapa al Sidebar

Para expandir el Sidebar lateral con una nueva pestaña visualizadora:

1. **Actualizar el DOM (`index.html`)**:
   * Agrega un nuevo panel hermano en `.nbi-sidebar__window` con la clase `.nbi-sidebar__view.hidden` e ID correspondiente:
     ```html
     <div class="nbi-sidebar__view hidden" id="view-myview" role="tabpanel" aria-labelledby="tab-myview">
       <!-- Tu HTML base -->
     </div>
     ```

2. **Registrar el Icono (`src/main.js`)**:
   * Importa el nuevo icono desde la librería `lucide` y regístralo dentro del objeto global `window.lucide` (ej: `MyIcon`).

3. **Registrar la Vista en el Arranque (`src/app/bootstrap.js`)**:
   * Agrega el objeto de configuración declarativa al instanciar el `Sidebar`:
     ```javascript
     {
       id: 'myview',
       label: 'Mi Solapa',
       title: 'Título de la Solapa',
       icon: 'my-icon' // Nombre registrado en Lucide
     }
     ```

4. **Inicializar tu Componente**:
   * En `bootstrap.js`, instancia tu componente modular inyectándole el contenedor específico de su vista:
     ```javascript
     const myComponent = new MyComponent(sidebarContainer.querySelector('#view-myview'))
     myComponent.mount()
     ```

---

## 4. Comportamiento en Fabric.js

* **Filtros de Daltonismo y Cromáticos**: Se aplican como filtros de composición CSS sobre el nodo `html` de la SPA. Puesto que los lienzos `<canvas>` interactivos de Fabric.js heredan las transformaciones directamente del documento raíz, el mapa base, las imágenes cargadas y los trazos dibujados se corrigen cromáticamente. Al delegar esto al procesado nativo del navegador, se evita la degradación de FPS que provocaría computar filtros WebGL individuales por objeto en Fabric.js.
* **Preservación Semántica de Cursores**: Fabric.js aplica cursores interactivos dinámicamente como estilos inline (ej: `cursor: grab`) en el lienzo `.upper-canvas`. Al activar el cursor grande (`data-large-cursor="true"`), interceptamos los estilos mediante selectores de atributos en CSS (`.upper-canvas[style*="cursor: grab"]`) para inyectar cursores SVG de alta resolución adaptados con Data-URIs. Esto preserva de forma precisa la semántica del cursor (`pointer`, `grab`, `grabbing`, `crosshair`, `text`).

---

## 5. Limitaciones Conocidas

* **Filtros de Daltonismo en Exportaciones**: Los filtros SVG de daltonismo y las inversiones visuales se aplican mediante estilos CSS de renderizado sobre el DOM del navegador. Al exportar el lienzo a formato PNG/JPG, Fabric.js serializa el mapa de bits nativo del lienzo, por lo que el archivo descargado conserva sus colores originales de diseño sin el filtro cromático de accesibilidad.
* **Compensación de Filtros en Lienzos**: Los stickers incrustados en el lienzo de Fabric.js se rasterizan conjuntamente con los trazos libres. Bajo el modo de inversión de color, no es posible aplicar la regla de "doble inversión" selectivamente a los stickers dibujados en el canvas como sí se realiza con las imágenes y botones del DOM, por lo que las ilustraciones dibujadas se verán invertidas cromáticamente.
