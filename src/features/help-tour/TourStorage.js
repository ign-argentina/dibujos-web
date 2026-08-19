import { persistenceService } from '../../core/persistence/PersistenceService.js'

export const TOUR_STORAGE_KEY = 'ign_tour_settings'

/**
 * Servicio encargado de persistir el progreso y las preferencias de avisos automáticos de tours.
 * Estructura extensible para tours futuros (general, drawing, maps, accessibility).
 */
export class TourStorage {
  /**
   * Carga la configuración completa de tours de forma segura con valores por defecto.
   * @param {PersistenceService} [service=persistenceService]
   * @returns {Object}
   */
  static loadSettings(service = persistenceService) {
    const defaults = {
      tours: {
        general: { completedVersion: 0, dismissedAutoPromptVersion: 0 },
        drawing: { completedVersion: 0, dismissedAutoPromptVersion: 0 },
        maps: { completedVersion: 0, dismissedAutoPromptVersion: 0 },
        accessibility: { completedVersion: 0, dismissedAutoPromptVersion: 0 }
      }
    }

    try {
      const raw = service.load(TOUR_STORAGE_KEY)
      if (!raw) return defaults

      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || typeof parsed.tours !== 'object') {
        return defaults
      }

      return {
        ...defaults,
        ...parsed,
        tours: {
          ...defaults.tours,
          ...parsed.tours
        }
      }
    } catch {
      return defaults
    }
  }

  /**
   * Guarda la configuración de tours en el almacenamiento persistente.
   * @param {Object} settings
   * @param {PersistenceService} [service=persistenceService]
   */
  static saveSettings(settings, service = persistenceService) {
    try {
      service.save(TOUR_STORAGE_KEY, JSON.stringify(settings))
    } catch (err) {
      console.warn('TourStorage: Error al persistir configuración de tours', err)
    }
  }

  /**
   * Obtiene el progreso de un tour específico.
   * @param {string} tourId
   * @param {PersistenceService} [service=persistenceService]
   * @returns {{ completedVersion: number, dismissedAutoPromptVersion: number }}
   */
  static getTourProgress(tourId, service = persistenceService) {
    const settings = this.loadSettings(service)
    const tourData = settings.tours[tourId] || { completedVersion: 0, dismissedAutoPromptVersion: 0 }
    return {
      completedVersion: typeof tourData.completedVersion === 'number' ? tourData.completedVersion : 0,
      dismissedAutoPromptVersion:
        typeof tourData.dismissedAutoPromptVersion === 'number'
          ? tourData.dismissedAutoPromptVersion
          : 0
    }
  }

  /**
   * Determina si un tour fue completado para una versión dada.
   * @param {string} tourId
   * @param {number} version
   * @param {PersistenceService} [service=persistenceService]
   * @returns {boolean}
   */
  static isTourCompleted(tourId, version, service = persistenceService) {
    const progress = this.getTourProgress(tourId, service)
    return progress.completedVersion >= version
  }

  /**
   * Determina si la invitación automática fue descartada permanentemente para una versión.
   * @param {string} tourId
   * @param {number} version
   * @param {PersistenceService} [service=persistenceService]
   * @returns {boolean}
   */
  static isAutoPromptDismissed(tourId, version, service = persistenceService) {
    const progress = this.getTourProgress(tourId, service)
    return progress.dismissedAutoPromptVersion >= version
  }

  /**
   * Determina si corresponde mostrar la invitación automática en el arranque.
   * @param {string} tourId
   * @param {number} version
   * @param {PersistenceService} [service=persistenceService]
   * @returns {boolean}
   */
  static shouldShowAutoPrompt(tourId, version, service = persistenceService) {
    if (this.isTourCompleted(tourId, version, service)) return false
    if (this.isAutoPromptDismissed(tourId, version, service)) return false
    return true
  }

  /**
   * Marca un tour como completado en una versión.
   * @param {string} tourId
   * @param {number} version
   * @param {PersistenceService} [service=persistenceService]
   */
  static setTourCompleted(tourId, version, service = persistenceService) {
    const settings = this.loadSettings(service)
    if (!settings.tours[tourId]) {
      settings.tours[tourId] = { completedVersion: 0, dismissedAutoPromptVersion: 0 }
    }
    settings.tours[tourId].completedVersion = Math.max(
      settings.tours[tourId].completedVersion || 0,
      version
    )
    this.saveSettings(settings, service)
  }

  /**
   * Guarda la preferencia "No volver a mostrar" para un tour en una versión.
   * @param {string} tourId
   * @param {number} version
   * @param {PersistenceService} [service=persistenceService]
   */
  static setTourAutoPromptDismissed(tourId, version, service = persistenceService) {
    const settings = this.loadSettings(service)
    if (!settings.tours[tourId]) {
      settings.tours[tourId] = { completedVersion: 0, dismissedAutoPromptVersion: 0 }
    }
    settings.tours[tourId].dismissedAutoPromptVersion = Math.max(
      settings.tours[tourId].dismissedAutoPromptVersion || 0,
      version
    )
    this.saveSettings(settings, service)
  }
}
