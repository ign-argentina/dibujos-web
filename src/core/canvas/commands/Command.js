/**
* Clase base abstracta para el patrón de comandos.
*/
export class Command {
  execute() {
    throw new Error('Método execute() no implementado')
  }

  undo() {
    throw new Error('Método undo() no implementado')
  }
}
