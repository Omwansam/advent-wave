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
    // Fail rather than drift. The proxy below forwards the browser's Origin header untouched
    // (changeOrigin rewrites Host, not Origin), so the gateway sees http://localhost:5174 and
    // checks it against adventwave.cors.allowed-origins. A dev server that hops to another
    // port sends an origin the gateway does not allow, and every request comes back 403.
    // 5173 is the listener app's; this one is the admin's.
    port: 5174,
    strictPort: true,
    // API calls go through the proxy, so the browser sees one origin. The master upload does
    // not: the browser PUTs the file straight to the uploadUrl the gateway returns, cross-origin,
    // exactly as it would to S3. That is why 5174 must be in the gateway's CORS list too.
    proxy: {
      '/v1': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
