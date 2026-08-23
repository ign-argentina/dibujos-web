import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ExportModal } from '../ExportModal.js'
import { appStore } from '../../../state/AppStore.js'

describe('ExportModal - Advertencia de Impresión', () => {
  let modalContainer
  let mockCanvasManager
  let mockMapRepository
  let exportModal

  beforeEach(() => {
    modalContainer = document.createElement('div')
    modalContainer.id = 'export-modal'
    modalContainer.className = 'nbi-export-modal-overlay hidden'
    modalContainer.innerHTML = `
      <div class="nbi-export-modal">
        <button id="export-modal-close"></button>
        <div class="nbi-export-modal__body">
          <div class="nbi-export-modal__config">
            <button id="exp-dest-save" class="is-active"></button>
            <button id="exp-dest-print"></button>

            <div id="exp-section-format">
              <button id="exp-fmt-pdf" class="is-active"></button>
              <button id="exp-fmt-png"></button>
              <button id="exp-fmt-jpg"></button>
            </div>

            <select id="exp-paper-size">
              <option value="A4" selected>A4</option>
              <option value="Oficio">Oficio</option>
            </select>

            <div class="nbi-export-modal__section">
              <button id="exp-orient-portrait" class="is-active"></button>
              <button id="exp-orient-landscape"></button>
            </div>

            <input id="exp-scale-slider" type="range" value="100" />
            <span id="exp-scale-val">100%</span>
            <button id="exp-btn-preset-100"></button>
            <select id="exp-quality-select">
              <option value="2" selected>Estándar</option>
            </select>

            <div class="nbi-export-modal__warning hidden" id="exp-print-warning" role="alert">
              <div class="nbi-export-modal__warning-header">
                <i data-lucide="alert-triangle" class="nbi-export-modal__warning-icon"></i>
                <span>Recomendación de Impresión</span>
              </div>
              <p class="nbi-export-modal__warning-text">
                Para mantener el tamaño real escolar (19 × 24 cm):
              </p>
              <ul class="nbi-export-modal__warning-list">
                <li><span id="exp-warn-orient">Vertical</span></li>
                <li><span id="exp-warn-paper">A4</span></li>
              </ul>
            </div>
          </div>

          <div class="nbi-export-modal__preview-container">
            <div id="exp-sheet-wrapper">
              <div id="exp-paper-sheet">
                <div id="exp-margin-box">
                  <img id="exp-preview-img" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="nbi-export-modal__footer">
          <button id="exp-btn-cancel"></button>
          <button id="exp-btn-submit">
            <i id="exp-submit-icon"></i>
            <span id="exp-submit-text">Descargar PDF</span>
          </button>
        </div>
      </div>
    `
    document.body.appendChild(modalContainer)

    mockCanvasManager = {
      getExportDataURL: vi.fn().mockReturnValue('data:image/png;base64,mockData'),
    }

    mockMapRepository = {
      getById: vi.fn().mockResolvedValue({
        id: 'map-1',
        name: 'Mapa Escolar Test',
        isPortrait: true,
      }),
    }

    vi.spyOn(appStore, 'getState').mockReturnValue({ activeMapId: 'map-1' })

    exportModal = new ExportModal(mockCanvasManager, mockMapRepository)
  })

  afterEach(() => {
    exportModal.unmount()
    modalContainer.remove()
    vi.restoreAllMocks()
  })

  it('debería mantener oculta la advertencia cuando el destino es "save"', () => {
    const warningEl = document.getElementById('exp-print-warning')
    expect(warningEl.classList.contains('hidden')).toBe(true)
  })

  it('debería mostrar la advertencia cuando se selecciona "print" y ocultarla al volver a "save"', () => {
    const warningEl = document.getElementById('exp-print-warning')

    exportModal.setDestination('print')
    expect(warningEl.classList.contains('hidden')).toBe(false)

    exportModal.setDestination('save')
    expect(warningEl.classList.contains('hidden')).toBe(true)
  })

  it('debería actualizar dinámicamente los valores de orientación y papel en la advertencia', async () => {
    const warnOrient = document.getElementById('exp-warn-orient')
    const warnPaper = document.getElementById('exp-warn-paper')

    exportModal.setDestination('print')
    expect(warnOrient.textContent).toBe('Vertical')
    expect(warnPaper.textContent).toBe('A4')

    await exportModal.setOrientation('landscape')
    expect(warnOrient.textContent).toBe('Horizontal')

    const paperSelect = document.getElementById('exp-paper-size')
    paperSelect.value = 'Oficio'
    paperSelect.dispatchEvent(new Event('change'))

    expect(warnPaper.textContent).toBe('Oficio / Legal')
  })

  it('debería inicializar el modal con destino "save" y advertencia oculta al llamar open()', async () => {
    await exportModal.open()

    const warningEl = document.getElementById('exp-print-warning')
    expect(warningEl.classList.contains('hidden')).toBe(true)
    expect(exportModal.destination).toBe('save')
  })
})
