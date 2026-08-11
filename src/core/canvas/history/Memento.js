/**
 * Representa el estado serializado del lienzo en un momento dado.
 */
export class Memento {
  /**
   * @param {string} state - Representación serializada en JSON del canvas.
   */
  constructor(state) {
    this.state = state
  }

  /**
   * Obtiene el estado guardado.
   * @returns {string}
   */
  getState() {
    return this.state
  }
}
