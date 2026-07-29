import { configRepository } from './ConfigRepository.js'

export class MapRepository {
  async getAll() {
    if (!configRepository.config) {
      await configRepository.load()
    }
    return configRepository.getMaps()
  }

  async getById(id) {
    const maps = await this.getAll()
    return maps.find((map) => map.id === id) || null
  }
}

export const mapRepository = new MapRepository()
