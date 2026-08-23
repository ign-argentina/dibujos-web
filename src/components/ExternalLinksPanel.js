import { Component } from '../features/Component.js'

/**
 * Lista declarativa por defecto de enlaces externos y recursos educativos oficiales del IGN.
 */
export const EXTERNAL_RESOURCES = [
  {
    id: 'ign-portal',
    title: 'Instituto Geográfico Nacional | de la República Argentina',
    url: 'https://www.ign.gob.ar/',
    description:
      'Sitio oficial con información cartográfica, geodésica, publicaciones y proyectos espaciales de la República Argentina.',
    tag: 'Portal Oficial',
    icon: 'globe'
  },
  {
    id: 'ign-visor',
    title: 'Visor del IGN',
    url: 'https://mapa.ign.gob.ar/',
    description:
      'Geovisualizador interactivo oficial con capas de información territorial, límites, relieve e imágenes satelitales.',
    tag: 'Visualizador',
    icon: 'map'
  },
  {
    id: 'ign-anida',
    title: 'ANIDA - Atlas Geográfico Digital de Argentina',
    url: 'https://anida.ign.gob.ar/',
    description:
      'Atlas Nacional Interactivo Digital de Argentina con mapas dinámicos temáticos y material educativo para el aula.',
    tag: 'Atlas Digital',
    icon: 'book-open'
  },
  {
    id: 'ign-mapas-escolares',
    title: 'Mapas Escolares | Instituto Geográfico Nacional',
    url: 'https://www.ign.gob.ar/AreaServicios/Descargas/MapasEscolares',
    description:
      'Catálogo de mapas mudos, físicos y políticos de Argentina y sus provincias listos para descargar e imprimir en formato escolar.',
    tag: 'Descargas',
    icon: 'file-down'
  }
]

/**
 * Componente que renderiza y gestiona la vista de Enlaces Externos / Recursos en el Sidebar.
 * Ofrece accesos directos a los portales cartográficos y educativos oficiales del IGN para su uso en la escuela.
 */
export class ExternalLinksPanel extends Component {
  /**
   * @param {HTMLElement} container - Contenedor DOM para la vista de enlaces (#view-links)
   * @param {Object} [props] - Propiedades configurables
   * @param {string} [props.intro] - Texto de introducción configurable
   * @param {Array} [props.resources] - Lista de recursos a mostrar configurable
   * @param {string} [props.buttonText] - Texto del botón de visita
   */
  constructor(container, props = {}) {
    super(container, props)
    this.intro =
      props.intro ||
      'Recursos y herramientas cartográficas oficiales de la República Argentina para consultar, descargar y trabajar en la escuela.'
    this.resources = props.resources || EXTERNAL_RESOURCES
    this.buttonText = props.buttonText || 'Visitar sitio'
  }

  render() {
    this.container.innerHTML = `
      <div class="nbi-links-panel" role="region" aria-label="Enlaces y recursos externos del IGN">
        <div class="nbi-links-panel__intro">
          <p class="nbi-links-panel__intro-text">${this.intro}</p>
        </div>
        <div class="nbi-links-panel__list">
          ${this.resources
            .map(
              (item) => `
            <article class="nbi-link-card" id="link-card-${item.id}">
              <div class="nbi-link-card__header">
                <span class="nbi-link-card__badge">${item.tag || 'Enlace'}</span>
                <i data-lucide="${item.icon || 'globe'}" class="nbi-link-card__icon" aria-hidden="true"></i>
              </div>
              <h3 class="nbi-link-card__title">${item.title}</h3>
              <p class="nbi-link-card__description">${item.description}</p>
              <div class="nbi-link-card__footer">
                <a
                  href="${item.url}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="nbi-btn nbi-btn--secondary nbi-link-card__btn"
                  aria-label="Abrir ${item.title} en una nueva pestaña (sitio externo)"
                >
                  <span>${this.buttonText}</span>
                  <i data-lucide="external-link" aria-hidden="true"></i>
                </a>
              </div>
            </article>
          `
            )
            .join('')}
        </div>
      </div>
    `

    if (window.lucide) {
      window.lucide.createIcons({
        attrs: {
          class: 'nbi-btn__icon'
        }
      })
    }
  }

  unmount() {
    super.unmount()
    if (this.container) {
      this.container.innerHTML = ''
    }
  }
}
