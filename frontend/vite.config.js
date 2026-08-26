import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const root = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    strictPort: false,
  },
  resolve: {
    alias: {
      // Privy pulls @stripe/crypto which imports this peer. Stub it —
      // Vite 8/Rolldown needs an absolute filesystem path, not /src/...
      '@stripe/stripe-js': resolve(root, 'src/lib/stripeStub.js'),
    },
  },
  optimizeDeps: {
    exclude: ['@stripe/crypto'],
  },
})
