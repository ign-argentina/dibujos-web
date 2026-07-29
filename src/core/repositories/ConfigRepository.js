export class ConfigRepository {
  constructor() {
    this.config = null
  }

  async load(configUrl = `${import.meta.env.BASE_URL}config.json`) {
    if (this.config) {
      return this.config
    }

    try {
      const response = await fetch(configUrl)
      if (!response.ok) {
        throw new Error(`Error al cargar la configuración: ${response.statusText}`)
      }
      this.config = await response.json()
      return this.config
    } catch (error) {
      console.error('Error cargando configuración:', error)
      throw error
    }
  }

  getMaps() {
    return this.config?.maps || []
  }

  getStickers() {
    return this.config?.stickers || []
  }
}

export const configRepository = new ConfigRepository()
