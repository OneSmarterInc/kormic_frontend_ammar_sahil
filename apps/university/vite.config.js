import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@kormic/portal-core': fileURLToPath(
        new URL('./node_modules/@kormic/portal-core/src', import.meta.url)
      ),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
    preserveSymlinks: true,
  },
  server: {
    port: 5173,
    fs: {
      allow: [fileURLToPath(new URL('../..', import.meta.url))],
    },
  },
})
