import { Component } from '../Component.js'
import { configRepository } from '../../core/repositories/ConfigRepository.js'

const COLOR_NAMES = {
  '#FFA2A2': 'Rojo pastel',
  '#82D3F8': 'Celeste',
  '#7ABE7D': 'Verde',
  '#E289F2': 'Violeta',
  '#A5A5A5': 'Gris',
  '#000000': 'Negro',
  '#FFA07A': 'Salmón',
  '#FFF4B0': 'Amarillo',
  '#E5828C': 'Rosa pastel',
  '#CC94D6': 'Violeta pastel',
  '#FFD700': 'Amarillo oro',
  '#98FB98': 'Verde pálido',
  '#AFEEEE': 'Turquesa',
  '#FFB6C1': 'Rosa claro',
  '#B0C4DE': 'Azul acero',
  '#E6E6FA': 'Lavanda',
  '#FFA500': 'Naranja',
  '#FFFFFF': 'Blanco'
}

function getColorName(hex) {
  if (!hex) return ''
  const upper = hex.toUpperCase()
  return COLOR_NAMES[upper] || hex
}

/**
 * Componente que renderiza y gestiona la paleta de colores predefinida, personalizada y reciente.
 * También controla el tamaño del pincel de dibujo.
 */
export class ColorPalette extends Component {
  constructor(container, props) {
    super(container, props)
    this.canvasManager = props.canvasManager
    this.customColors = []
    this.lastUsedColors = ['#FFA07A', '#82d3f8', '#7abe7d']
  }

  render() {
    const uiConfig = configRepository.getUiConfig()
    const palette = uiConfig.colorPalette || [
      '#FFA2A2',
      '#82D3F8',
      '#7ABE7D',
      '#E289F2',
      '#A5A5A5',
      '#000000',
    ]

    this.colorChipsContainer = document.getElementById('color-chips-container')
    this.recentColorsContainer = document.getElementById('recent-colors-container')
    this.strokeSlider = document.getElementById('stroke-slider')
    this.strokeValueDisplay = document.getElementById('stroke-value-display')
    this.customColorPicker = document.getElementById('custom-color-picker')
    this.propertiesPanel = document.getElementById('properties-panel')
    this.togglePropertiesBtn = document.getElementById('toggle-properties-btn')



    // Inyectar chips de colores dinámicamente según la paleta configurada
    if (this.colorChipsContainer) {
      this.colorChipsContainer.innerHTML = ''
      palette.forEach((color) => {
        const chip = document.createElement('button')
        chip.type = 'button'
        chip.role = 'radio'
        chip.className = 'nbi-color-chip'
        const isSelected = color.toLowerCase() === this.canvasManager.activeColor.toLowerCase()
        if (isSelected) {
          chip.classList.add('is-active')
          chip.setAttribute('aria-checked', 'true')
        } else {
          chip.setAttribute('aria-checked', 'false')
        }
        chip.style.backgroundColor = color
        chip.setAttribute('data-color', color)
        chip.setAttribute('title', `Color: ${getColorName(color)}`)
        chip.setAttribute('aria-label', `Color ${getColorName(color)}`)
        this.colorChipsContainer.appendChild(chip)
      })
    }

    if (this.strokeSlider) {
      this.strokeSlider.value = this.canvasManager.activeStrokeWidth
    }
    if (this.strokeValueDisplay) {
      this.strokeValueDisplay.textContent = `${this.canvasManager.activeStrokeWidth}px`
    }

    this.renderRecentColors()
  }

  bindEvents() {
    this.addEvent(this.colorChipsContainer, 'click', (e) => {
      const chip = e.target.closest('.nbi-color-chip')
      if (chip) {
        const color = chip.getAttribute('data-color')
        this.selectColor(color, chip)
      }
    })

    if (this.recentColorsContainer) {
      this.addEvent(this.recentColorsContainer, 'click', (e) => {
        const chip = e.target.closest('.nbi-color-chip')
        if (chip) {
          const color = chip.getAttribute('data-color')
          this.selectColor(color, chip)
        }
      })
    }

    this.addEvent(this.customColorPicker, 'change', (e) => {
      const hexColor = e.target.value.toUpperCase()
      this.customColors = this.customColors.filter((c) => c !== hexColor)
      this.customColors.push(hexColor)
      if (this.customColors.length > 5) {
        this.customColors.shift()
      }
      this.renderCustomChips()
      const targetChip = this.colorChipsContainer.querySelector(
        `.nbi-color-chip[data-color="${hexColor}"]`
      )
      this.selectColor(hexColor, targetChip)
    })

    this.addEvent(this.strokeSlider, 'input', (e) => {
      const width = e.target.value
      this.strokeValueDisplay.textContent = `${width}px`
      this.canvasManager.setActiveStrokeWidth(width, false)
    })

    this.addEvent(this.strokeSlider, 'change', () => {
      if (this.canvasManager.canvas) {
        const activeObject = this.canvasManager.adapter.getActiveObject()
        if (activeObject && activeObject.type !== 'textbox') {
          this.canvasManager.adapter.fire('object:modified')
        }
      }
    })

    this.addEvent(this.togglePropertiesBtn, 'click', () => {
      const isCollapsed = this.propertiesPanel.classList.toggle('is-collapsed')

      if (isCollapsed) {
        this.togglePropertiesBtn.setAttribute('title', 'Expandir Panel')
        this.togglePropertiesBtn.setAttribute('aria-label', 'Expandir panel de color')
        this.togglePropertiesBtn.setAttribute('aria-expanded', 'false')
        this.togglePropertiesBtn.innerHTML = '<i data-lucide="chevron-left"></i>'
        this.recentColorsContainer.classList.remove('hidden')
        this.renderRecentColors()
      } else {
        this.togglePropertiesBtn.setAttribute('title', 'Colapsar Panel')
        this.togglePropertiesBtn.setAttribute('aria-label', 'Colapsar panel de color')
        this.togglePropertiesBtn.setAttribute('aria-expanded', 'true')
        this.togglePropertiesBtn.innerHTML = '<i data-lucide="chevron-right"></i>'
        this.recentColorsContainer.classList.add('hidden')
      }

      if (window.lucide) {
        window.lucide.createIcons()
      }
    })
  }

  selectColor(color, activeChip) {
    this.lastUsedColors = [
      color,
      ...this.lastUsedColors.filter((c) => c.toLowerCase() !== color.toLowerCase()),
    ].slice(0, 3)

    document.querySelectorAll('.nbi-color-chip').forEach((c) => {
      c.classList.remove('is-active')
      c.setAttribute('aria-checked', 'false')
    })

    if (activeChip) {
      activeChip.classList.add('is-active')
      activeChip.setAttribute('aria-checked', 'true')
    }

    this.canvasManager.setActiveColor(color)
    this.renderRecentColors()
  }

  renderRecentColors() {
    if (!this.recentColorsContainer) return
    this.recentColorsContainer.innerHTML = ''

    this.lastUsedColors.forEach((color) => {
      const chip = document.createElement('button')
      chip.type = 'button'
      chip.role = 'radio'
      chip.className = 'nbi-color-chip'
      const isSelected = color.toLowerCase() === this.canvasManager.activeColor.toLowerCase()
      if (isSelected) {
        chip.classList.add('is-active')
      }
      chip.setAttribute('aria-checked', isSelected ? 'true' : 'false')
      chip.style.backgroundColor = color
      chip.setAttribute('data-color', color)
      chip.setAttribute('title', `Color reciente: ${getColorName(color)}`)
      chip.setAttribute('aria-label', `Color reciente ${getColorName(color)}`)

      this.recentColorsContainer.appendChild(chip)
    })
  }

  renderCustomChips() {
    this.colorChipsContainer
      .querySelectorAll('.nbi-color-chip.is-custom-chip')
      .forEach((c) => c.remove())
    const blackChip = this.colorChipsContainer.querySelector(
      '.nbi-color-chip[data-color="#000000"]'
    )

    this.customColors.forEach((color) => {
      const chip = document.createElement('button')
      chip.type = 'button'
      chip.role = 'radio'
      chip.setAttribute('aria-checked', 'false')
      chip.className = 'nbi-color-chip is-custom-chip'
      chip.style.backgroundColor = color
      chip.setAttribute('data-color', color)
      chip.setAttribute('title', `Personalizado: ${getColorName(color)}`)
      chip.setAttribute('aria-label', `Color personalizado ${getColorName(color)}`)

      if (blackChip) {
        this.colorChipsContainer.insertBefore(chip, blackChip)
      } else {
        this.colorChipsContainer.appendChild(chip)
      }
    })
  }
}
