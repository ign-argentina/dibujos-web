export class ConfigRepository {
  constructor() {
    this.config = null
  }

  async load(configUrl) {
    if (this.config) {
      return this.config
    }

    const primaryUrl = configUrl || `${import.meta.env.BASE_URL}config/config.json`
    const fallbackUrl = `${import.meta.env.BASE_URL}config/default/config.json`

    try {
      const response = await fetch(primaryUrl)
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }
      this.config = await response.json()
      return this.config
    } catch (error) {
      console.warn(
        `Error cargando configuración de ${primaryUrl}, intentando fallback a ${fallbackUrl}:`,
        error
      )
      try {
        const response = await fetch(fallbackUrl)
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`)
        }
        this.config = await response.json()
        return this.config
      } catch (fallbackError) {
        console.error('Error crítico al cargar configuración por defecto:', fallbackError)
        throw fallbackError
      }
    }
  }

  getMaps() {
    return this.config?.maps || []
  }

  getStickers() {
    return this.config?.stickers || []
  }

  getUiConfig() {
    return this.config?.ui || {}
  }

  getExportFilenamePrefix() {
    return this.config?.ui?.exportFilenamePrefix || 'mapas_escolares_IGN_'
  }
}

export const configRepository = new ConfigRepository()
