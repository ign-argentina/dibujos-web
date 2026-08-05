import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { compressImage } from '../imageCompressor.js'

describe('imageCompressor', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('debería rechazar si no se proporciona ningún archivo', async () => {
    await expect(compressImage(null)).rejects.toThrow('No se proporcionó ningún archivo.')
  })

  it('debería leer archivos SVG directamente usando FileReader sin usar canvas', async () => {
    const file = new File(['<svg></svg>'], 'test.svg', { type: 'image/svg+xml' })

    const result = await compressImage(file)
    expect(result.dataUrl).toContain('data:image/svg+xml')
    expect(result.width).toBeNull()
    expect(result.height).toBeNull()
  })

  it('debería redimensionar y comprimir imágenes rasterizadas que superan el límite', async () => {
    const file = new File(['fake-image-content'], 'test.png', { type: 'image/png' })

    const mockImageInstance = {
      set src(value) {
        // Simular carga asíncrona de imagen
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 0)
      },
      naturalWidth: 2000,
      naturalHeight: 1000,
      width: 2000,
      height: 1000,
    }

    const originalImage = global.Image
    vi.stubGlobal('Image', vi.fn(function() { return mockImageInstance }))

    const mockContext = {
      drawImage: vi.fn(),
    }
    const mockCanvas = {
      getContext: vi.fn(() => mockContext),
      toDataURL: vi.fn(() => 'data:image/png;base64,mockedpngdata'),
      width: 0,
      height: 0,
    }

    const originalCreateElement = document.createElement
    document.createElement = vi.fn((tag) => {
      if (tag === 'canvas') return mockCanvas
      return originalCreateElement.call(document, tag)
    })

    const result = await compressImage(file, { maxWidth: 1024, maxHeight: 1024 })

    expect(result.width).toBe(1024)
    expect(result.height).toBe(512) // Mantiene relación de aspecto (2000/1000 -> 1024/512)
    expect(result.dataUrl).toBe('data:image/png;base64,mockedpngdata')
    expect(mockContext.drawImage).toHaveBeenCalled()
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png', 0.8)

    // Restaurar globals
    global.Image = originalImage
    document.createElement = originalCreateElement
  })

  it('debería usar FileReader como fallback si ocurre un error con el canvas', async () => {
    const file = new File(['fake-image-content'], 'test.jpg', { type: 'image/jpeg' })

    const mockImageInstance = {
      set src(value) {
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 0)
      },
      naturalWidth: 500,
      naturalHeight: 500,
      width: 500,
      height: 500,
    }

    const originalImage = global.Image
    vi.stubGlobal('Image', vi.fn(function() { return mockImageInstance }))

    // Forzar error en getContext para simular fallo en canvas
    const mockCanvas = {
      getContext: vi.fn(() => null),
      width: 0,
      height: 0,
    }

    const originalCreateElement = document.createElement
    document.createElement = vi.fn((tag) => {
      if (tag === 'canvas') return mockCanvas
      return originalCreateElement.call(document, tag)
    })

    const result = await compressImage(file)

    // Debe resolver usando FileReader sin lanzar error
    expect(result.dataUrl).toContain('data:image/jpeg')
    expect(result.width).toBe(500)
    expect(result.height).toBe(500)

    // Restaurar globals
    global.Image = originalImage
    document.createElement = originalCreateElement
  })
})
