/**
 * Redimensiona y comprime una imagen local si supera ciertas dimensiones o tamaño.
 * @param {File|Blob} file - El archivo de imagen original.
 * @param {Object} [options]
 * @param {number} [options.maxWidth=1024] - Ancho máximo permitido.
 * @param {number} [options.maxHeight=1024] - Alto máximo permitido.
 * @param {number} [options.quality=0.8] - Calidad de compresión para JPEG/WebP (0 a 1).
 * @returns {Promise<{dataUrl: string, width: number|null, height: number|null}>}
 */
export function compressImage(file, { maxWidth = 1024, maxHeight = 1024, quality = 0.8 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No se proporcionó ningún archivo.'))
    }

    // Si es SVG, no lo redimensionamos con canvas para no rasterizarlo y conservar su calidad vectorial.
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader()
      reader.onload = (e) => {
        resolve({
          dataUrl: e.target.result,
          width: null,
          height: null,
        })
      }
      reader.onerror = (err) => reject(err)
      reader.readAsDataURL(file)
      return
    }

    const img = new Image()
    let objectUrl = null

    try {
      objectUrl = URL.createObjectURL(file)
    } catch (err) {
      // Fallback si no se puede crear ObjectURL (entornos virtuales / jsdom sin implementación)
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target.result
      }
      reader.onerror = (readErr) => reject(readErr)
      reader.readAsDataURL(file)
    }

    img.onload = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }

      let width = img.naturalWidth || img.width
      let height = img.naturalHeight || img.height

      // Determinar si es necesario redimensionar
      let needsResize = false
      if (width > maxWidth || height > maxHeight) {
        needsResize = true
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }
      }

      // Si no necesita redimensionamiento y es PNG, o si por cualquier razón fallara el canvas,
      // podemos usar el canvas igualmente para asegurar compresión y limpieza de metadatos,
      // pero si ocurre un error, usaremos un FileReader como fallback seguro.
      try {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          throw new Error('No se pudo obtener el contexto 2d del canvas')
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Si el archivo original es PNG, mantenemos PNG para conservar transparencias
        const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        const dataUrl = canvas.toDataURL(format, quality)

        resolve({ dataUrl, width, height })
      } catch (err) {
        // Fallback en caso de error de canvas: resolver con el archivo original en base64
        const reader = new FileReader()
        reader.onload = (e) => {
          resolve({
            dataUrl: e.target.result,
            width: img.width || null,
            height: img.height || null,
          })
        }
        reader.onerror = (readErr) => reject(readErr)
        reader.readAsDataURL(file)
      }
    }

    img.onerror = (err) => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
      reject(err)
    }

    if (objectUrl) {
      img.src = objectUrl
    }
  })
}
