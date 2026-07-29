import { appStore } from './AppStore.js'

export class AppState {
  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('El callback debe ser una función')
    }
    // Mapear al callback con la firma compatible { activeMapId }
    return appStore.subscribe((state) => {
      callback({
        activeMapId: state.activeMapId,
      })
    })
  }

  setActiveMapId(mapId) {
    appStore.dispatch({ type: 'SET_ACTIVE_MAP_ID', payload: mapId })
  }

  getActiveMapId() {
    return appStore.getState().activeMapId
  }
}

export const appState = new AppState()
