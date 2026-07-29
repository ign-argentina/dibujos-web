import { configRepository } from './ConfigRepository.js'

export class StickerRepository {
  async getAll() {
    if (!configRepository.config) {
      await configRepository.load()
    }
    return configRepository.getStickers()
  }
}

export const stickerRepository = new StickerRepository()
