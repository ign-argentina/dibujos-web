import './styles/style.css'
import { bootstrap } from './app/bootstrap.js'

// Arrancar la aplicación una vez cargado el DOM
document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((err) => {
    console.error('Error durante el arranque de la aplicación:', err)
  })
})
