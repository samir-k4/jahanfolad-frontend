import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n.js'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { BranchProvider } from './context/BranchContext.jsx'
import { CompanyProvider } from './context/CompanyContext.jsx'
import { installAuthInterceptor } from './api.js'
import { initPersianDigitsAutoConverter } from './utils/persianDigitsAutoConverter.js'

// Attach the auth token to every API request, including the call sites that
// still use fetch(apiUrl(...)) directly. Must run before anything fetches.
installAuthInterceptor()

// Automatically translate Persian/Dari keyboard digits (۰-۹) to standard numbers across the entire application
initPersianDigitsAutoConverter()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CompanyProvider>
          <BranchProvider>
            <App />
          </BranchProvider>
        </CompanyProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
