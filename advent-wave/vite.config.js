import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Fail rather than drift. Vite's default is to hop to 5174 when 5173 is taken, and the
    // proxy below forwards the browser's Origin header untouched (changeOrigin rewrites
    // Host, not Origin), so a second dev server silently starts sending an origin the
    // gateway does not allow and every request comes back 403.
    port: 5173,
    strictPort: true,
    // The dev server proxies the API so the browser sees one origin: no preflight, no CORS
    // config to keep in sync, and VITE_API_BASE_URL stays empty in development. Production
    // builds set VITE_API_BASE_URL to the real gateway origin instead.
    proxy: {
      '/v1': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
