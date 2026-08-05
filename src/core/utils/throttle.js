/**
 * Controla la frecuencia de ejecución de una función callback (Throttle).
 * @param {Function} fn - Función a ejecutar.
 * @param {number} delay - Intervalo de tiempo en milisegundos.
 * @returns {Function}
 */
export function throttle(fn, delay) {
  let lastCall = 0
  let timeoutId = null

  return function (...args) {
    const now = new Date().getTime()
    
    if (now - lastCall < delay) {
      if (timeoutId) clearTimeout(timeoutId)
      
      timeoutId = setTimeout(() => {
        lastCall = now
        fn(...args)
      }, delay - (now - lastCall))
      return
    }

    lastCall = now
    fn(...args)
  }
}
