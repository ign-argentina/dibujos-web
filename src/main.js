import './styles/style.css'
import {
  createIcons,
  Link2,
  ChevronLeft,
  ChevronRight,
  Hand,
  SquareDashedMousePointer,
  Pencil,
  Square,
  Circle,
  MoveRight,
  Route,
  Pentagon,
  Type,
  MapPin,
  Smile,
  Eraser,
  Palette,
  Undo2,
  Redo2,
  ZoomIn,
  Home,
  ZoomOut,
  FileDown,
  FileOutput,
  X,
  Download,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FlipHorizontal,
  FlipVertical,
  Lock,
  Unlock,
  Copy,
  ArrowUp,
  ArrowDown,
  Trash2,
  Printer,
  Search,
  Image,
  ChevronDown,
  RotateCcw
} from 'lucide'

// Expose lucide globally to maintain vanilla JS components compatibility
window.lucide = {
  createIcons: () =>
    createIcons({
      icons: {
        Link2,
        ChevronLeft,
        ChevronRight,
        Hand,
        SquareDashedMousePointer,
        Pencil,
        Square,
        Circle,
        MoveRight,
        Route,
        Pentagon,
        Type,
        MapPin,
        Smile,
        Eraser,
        Palette,
        Undo2,
        Redo2,
        ZoomIn,
        Home,
        ZoomOut,
        FileDown,
        FileOutput,
        X,
        Download,
        Sliders,
        AlignLeft,
        AlignCenter,
        AlignRight,
        FlipHorizontal,
        FlipVertical,
        Lock,
        Unlock,
        Copy,
        ArrowUp,
        ArrowDown,
        Trash2,
        Printer,
        Search,
        Image,
        ChevronDown,
        RotateCcw
      }
    })
}

import { bootstrap } from './app/bootstrap.js'

// Arrancar la aplicación una vez cargado el DOM
document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((err) => {
    console.error('Error durante el arranque de la aplicación:', err)
  })
})
