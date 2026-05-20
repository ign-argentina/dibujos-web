import './styles/style.css'
import { CanvasManager } from './core/canvasManager.js'

const appRoot = document.querySelector('#app')
if (!appRoot) {
  throw new Error('No se encontró el elemento #app')
}

const editorContainer = document.createElement('div')
editorContainer.id = 'editor-container'
editorContainer.className = 'canvas-root'
appRoot.appendChild(editorContainer)

const canvasManager = new CanvasManager(editorContainer)
canvasManager.init()