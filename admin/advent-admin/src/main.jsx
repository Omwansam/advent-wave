import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { onUnauthorized } from './api/token'
import { useAuthStore } from './store/useAuthStore'

// Any 401 ends the session: the server no longer accepts the token — it expired, the password
// changed, the account was disabled or its role changed — whatever the client thinks.
onUnauthorized(() => {
  if (useAuthStore.getState().token) {
    useAuthStore.getState().signOut({ notice: 'Your session ended. Sign in again.' })
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
