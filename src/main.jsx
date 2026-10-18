import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './i18n.js'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { BranchProvider } from './context/BranchContext.jsx'
import { CompanyProvider } from './context/CompanyContext.jsx'
import { installAuthInterceptor } from './api.js'
import { initPersianDigitsAutoConverter } from './utils/persianDigitsAutoConverter.js'
import { queryClient } from './queryClient.js'

const FONT_WEIGHTS = [400, 500, 600, 700]
const FONT_GATE_ID = 'font-gate'

async function loadRequiredFont() {
  const loadedFaces = await Promise.all(
    FONT_WEIGHTS.map((weight) =>
      document.fonts.load(`${weight} 16px "Roshan AL"`),
    ),
  )

  return loadedFaces.every(
    (faces, index) =>
      faces.length > 0 &&
      document.fonts.check(`${FONT_WEIGHTS[index]} 16px "Roshan AL"`),
  )
}

function createSvgIcon(pathData, className) {
  const svgNamespace = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNamespace, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  if (className) svg.setAttribute('class', className)

  pathData.forEach((data) => {
    const path = document.createElementNS(svgNamespace, 'path')
    path.setAttribute('d', data)
    svg.appendChild(path)
  })

  return svg
}

function showFontLoadError() {
  const gate = document.getElementById(FONT_GATE_ID)
  if (!gate) return

  gate.setAttribute('role', 'alert')
  gate.replaceChildren()
  gate.appendChild(
    createSvgIcon(
      ['M12 9v4', 'M12 17h.01', 'M10.3 3.9 1.8 18.6A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.4L13.7 3.9a2 2 0 0 0-3.4 0Z'],
      'font-error',
    ),
  )

  const retryButton = document.createElement('button')
  retryButton.type = 'button'
  retryButton.className = 'font-retry'
  retryButton.setAttribute('aria-label', 'Retry loading required font')
  retryButton.style.marginInlineStart = '16px'
  retryButton.appendChild(
    createSvgIcon([
      'M20 7v5h-5',
      'M4 17v-5h5',
      'M5.6 9a7 7 0 0 1 11.6-2L20 12',
      'M4 12l2.8 5a7 7 0 0 0 11.6-2',
    ]),
  )
  retryButton.addEventListener('click', bootstrap)
  gate.appendChild(retryButton)
}

function renderApplication() {
  // Attach the auth token before any application code makes a request.
  installAuthInterceptor()
  initPersianDigitsAutoConverter()

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <CompanyProvider>
              <BranchProvider>
                <App />
              </BranchProvider>
            </CompanyProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  )
}

async function bootstrap() {
  const gate = document.getElementById(FONT_GATE_ID)
  if (gate) {
    gate.setAttribute('role', 'status')
    gate.replaceChildren(
      createSvgIcon(
        ['M21 12a9 9 0 1 1-2.64-6.36', 'M21 3v6h-6'],
        'font-spinner',
      ),
    )
    const spinner = gate.querySelector('svg')
    spinner.style.color = '#334155'
  }

  try {
    if (!(await loadRequiredFont())) {
      throw new Error('One or more required Roshan AL font weights failed to load.')
    }
    renderApplication()
  } catch (error) {
    console.error('Unable to load the required Roshan AL font.', error)
    showFontLoadError()
  }
}

bootstrap()
