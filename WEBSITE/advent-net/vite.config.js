import net from 'node:net'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// Node gives each of a host's addresses 250 ms to connect before moving to the next, and fails
// with ETIMEDOUT once every one has missed that, though the server is up: on a slow or busy line
// every proxied request then fails. Give each address 2.5 s, as a browser would.
net.setDefaultAutoSelectFamilyAttemptTimeout(2500)

// In development the site asks the live service through this proxy, so the browser sees one
// origin. AW_API_TARGET points /v1 at another gateway, e.g. a local one on http://localhost:8080;
// /downloads always comes from the live server, which is where the installers are. A connected
// server that goes quiet for 15 s is given up on; a connection that never completes is not timed
// here, but the page stops waiting after 10 s (src/lib/adventwave.js) and this request goes too.
const LIVE = 'https://adventwave.draftbitlabs.tech'
const proxy = {
  '/v1': { target: process.env.AW_API_TARGET || LIVE, changeOrigin: true, proxyTimeout: 15000 },
  '/downloads': { target: LIVE, changeOrigin: true, proxyTimeout: 15000 },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy },
  preview: { proxy },
})
