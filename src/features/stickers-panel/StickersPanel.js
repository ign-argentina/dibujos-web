import { Component } from '../Component.js'
import { stickerRepository } from '../../core/repositories/StickerRepository.js'

/**
 * Componente que renderiza dinámicamente el catálogo de stickers y maneja la interactividad del panel.
 */
export class StickersPanel extends Component {
  constructor(container, props) {
    super(container, props)
    this.canvasManager = props.canvasManager
  }

  async render() {
    this.stickersContainer = document.getElementById('stickers-container')
    this.stickersPanel = document.getElementById('stickers-panel')
    this.toggleStickersBtn = document.getElementById('toggle-stickers-btn')
    this.toolStickersBtn = document.getElementById('tool-stickers')

    // Generar la galería de stickers dinámicamente desde el StickersRepository
    if (this.stickersContainer) {
      this.stickersContainer.innerHTML = ''
      const categories = await stickerRepository.getCategorized()
      categories.forEach((category) => {
        if (category.stickers.length === 0) return

        const section = document.createElement('section')
        section.className = 'nbi-stickers__category'

        const title = document.createElement('h3')
        title.className = 'nbi-stickers__category-title'
        title.textContent = category.name
        section.appendChild(title)

        const itemsContainer = document.createElement('div')
        itemsContainer.className = 'nbi-stickers__category-items'

        category.stickers.forEach((name) => {
          const item = document.createElement('button')
          item.className = 'nbi-stickers__item'
          item.setAttribute('title', `Agregar sticker de ${name.replace(/-/g, ' ')}`)
          item.setAttribute('aria-label', `Agregar sticker de ${name.replace(/-/g, ' ')}`)

          const img = document.createElement('img')
          img.src = `${import.meta.env.BASE_URL}stickers/${name}.svg`
          img.alt = name
          img.className = 'nbi-stickers__img'
          img.setAttribute('loading', 'lazy')

          item.appendChild(img)
          item.setAttribute('data-src', `${import.meta.env.BASE_URL}stickers/${name}.svg`)

          itemsContainer.appendChild(item)
        })

        section.appendChild(itemsContainer)
        this.stickersContainer.appendChild(section)
      })
    }
  }

  bindEvents() {
    if (this.toolStickersBtn) {
      this.addEvent(this.toolStickersBtn, 'click', () => {
        if (this.stickersPanel.classList.contains('hidden')) {
          this.openStickersPanel()
        } else {
          this.closeStickersPanel()
        }
      })
    }

    if (this.toggleStickersBtn) {
      this.addEvent(this.toggleStickersBtn, 'click', () => {
        this.closeStickersPanel()
      })
    }

    if (this.stickersContainer) {
      this.addEvent(this.stickersContainer, 'click', (e) => {
        const item = e.target.closest('.nbi-stickers__item')
        if (item) {
          const src = item.getAttribute('data-src')
          if (src) {
            this.canvasManager.addSticker(src)
          }
        }
      })
    }
  }

  openStickersPanel() {
    this.stickersPanel.classList.remove('hidden')
    if (this.toolStickersBtn) {
      this.toolStickersBtn.classList.add('is-active')
      this.toolStickersBtn.setAttribute('aria-expanded', 'true')
    }
  }

  closeStickersPanel() {
    this.stickersPanel.classList.add('hidden')
    if (this.toolStickersBtn) {
      this.toolStickersBtn.classList.remove('is-active')
      this.toolStickersBtn.setAttribute('aria-expanded', 'false')
      this.toolStickersBtn.focus()
    }
  }
}
