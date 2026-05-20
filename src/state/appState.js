export class AppState {
  constructor() {
    this.activeMapId = null
    this.listeners = []
  }

  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('El callback debe ser una función')
    }
    this.listeners.push(callback)

    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback)
    }
  }

  setActiveMapId(mapId) {
    if (this.activeMapId === mapId) return

    this.activeMapId = mapId
    this.emit()
  }

  getActiveMapId() {
    return this.activeMapId
  }

  emit() {
    this.listeners.forEach((callback) => {
      callback({
        activeMapId: this.activeMapId,
      })
    })
  }
}

export const appState = new AppState()
