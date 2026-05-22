import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import useStore from './store/useStore'

// Expose the Zustand store in dev for debugging / testing
if (import.meta.env.DEV) {
  window.__store = useStore;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
