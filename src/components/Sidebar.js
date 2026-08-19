import { Component } from '../features/Component.js'

/**
 * Componente que gestiona el contenedor lateral, las solapas verticales
 * y la carga dinámica de las vistas registradas.
 */
export class Sidebar extends Component {
  constructor(container, props = {}) {
    super(container, props)
    this.views = props.views || []
    this.activeViewId = props.defaultViewId || 'maps'
    this.isOpen = !this.container.classList.contains('is-collapsed')
  }

  render() {
    this.tabsContainer = this.container.querySelector('.nbi-sidebar__tabs')
    this.titleElement = this.container.querySelector('#sidebar-title')
    this.closeBtn = this.container.querySelector('#close-sidebar-btn')

    // Renderizar dinámicamente las solapas (tabs)
    if (this.tabsContainer) {
      this.tabsContainer.innerHTML = ''
      this.views.forEach((view) => {
        const tabButton = document.createElement('button')
        tabButton.type = 'button'
        tabButton.className = 'nbi-sidebar__tab'
        tabButton.id = `tab-${view.id}`
        tabButton.setAttribute('data-tour', `sidebar-${view.id}`)
        tabButton.role = 'tab'
        tabButton.setAttribute('aria-selected', 'false')
        tabButton.setAttribute('aria-controls', `view-${view.id}`)
        tabButton.setAttribute('title', view.label)
        tabButton.setAttribute('aria-label', view.label)

        const icon = document.createElement('i')
        icon.setAttribute('data-lucide', view.icon)

        tabButton.appendChild(icon)
        this.tabsContainer.appendChild(tabButton)
      })
    }

    if (window.lucide) {
      window.lucide.createIcons()
    }
  }

  bindEvents() {
    // 1. Clic en las solapas
    this.views.forEach((view) => {
      const tabButton = this.container.querySelector(`#tab-${view.id}`)
      if (tabButton) {
        this.addEvent(tabButton, 'click', () => {
          this.handleTabClick(view.id)
        })
      }
    })

    // 2. Clic en el botón de cierre explícito
    if (this.closeBtn) {
      this.addEvent(this.closeBtn, 'click', () => {
        this.close()
      })
    }

    // 3. Soporte para cerrar con tecla Escape
    this.addEvent(window, 'keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close()
      }
    })

    // 4. Navegación por teclado (Flechas) entre solapas
    if (this.tabsContainer) {
      const tabs = Array.from(this.tabsContainer.querySelectorAll('.nbi-sidebar__tab'))
      tabs.forEach((tab, index) => {
        this.addEvent(tab, 'keydown', (e) => {
          let targetIndex = -1
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            targetIndex = (index + 1) % tabs.length
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            targetIndex = (index - 1 + tabs.length) % tabs.length
          }

          if (targetIndex !== -1) {
            e.preventDefault()
            tabs[targetIndex].focus()
          }
        })
      })
    }
  }

  mount() {
    super.mount()
    if (this.activeViewId) {
      this.switchView(this.activeViewId)
      if (this.isOpen) {
        const activeTab = this.container.querySelector(`#tab-${this.activeViewId}`)
        if (activeTab) {
          activeTab.classList.add('is-active')
          activeTab.setAttribute('aria-selected', 'true')
        }
      }
    }
  }

  handleTabClick(viewId) {
    if (this.isOpen && this.activeViewId === viewId) {
      this.close()
    } else {
      this.switchView(viewId)
      if (!this.isOpen) {
        this.open()
      }
    }
  }

  open() {
    this.isOpen = true
    this.container.classList.remove('is-collapsed')
    
    // Sincronizar estado visual de la pestaña activa
    if (this.activeViewId) {
      const activeTab = this.container.querySelector(`#tab-${this.activeViewId}`)
      if (activeTab) {
        activeTab.classList.add('is-active')
        activeTab.setAttribute('aria-selected', 'true')
      }
    }

    if (this.closeBtn) {
      this.closeBtn.focus()
    }
  }

  close() {
    this.isOpen = true // Mantener estado interno para animación
    this.container.classList.add('is-collapsed')
    this.isOpen = false

    // Desactivar visualmente las solapas al colapsar
    this.views.forEach((view) => {
      const tabButton = this.container.querySelector(`#tab-${view.id}`)
      if (tabButton) {
        tabButton.classList.remove('is-active')
        tabButton.setAttribute('aria-selected', 'false')
      }
    })

    // Retornar foco a la solapa que estaba activa
    if (this.activeViewId) {
      const activeTab = this.container.querySelector(`#tab-${this.activeViewId}`)
      if (activeTab) {
        activeTab.focus()
      }
    }
  }

  switchView(viewId) {
    this.activeViewId = viewId

    this.views.forEach((view) => {
      const tabButton = this.container.querySelector(`#tab-${view.id}`)
      const viewEl = this.container.querySelector(`#view-${view.id}`)

      if (view.id === viewId) {
        if (tabButton && this.isOpen) {
          tabButton.classList.add('is-active')
          tabButton.setAttribute('aria-selected', 'true')
        }
        if (viewEl) {
          viewEl.classList.remove('hidden')
        }
        if (this.titleElement) {
          this.titleElement.textContent = view.title
        }
      } else {
        if (tabButton) {
          tabButton.classList.remove('is-active')
          tabButton.setAttribute('aria-selected', 'false')
        }
        if (viewEl) {
          viewEl.classList.add('hidden')
        }
      }
    })
  }
}
