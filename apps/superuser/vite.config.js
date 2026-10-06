import { backendOrigin } from '../../scripts/backend-config.mjs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(backendOrigin()), 'import.meta.env.VITE_LOCAL_API_BASE_URL': JSON.stringify(backendOrigin('LOCAL')) },
  resolve: {
    alias: {
      '@kormic/portal-core': fileURLToPath(
        new URL('../../packages/portal-core/src', import.meta.url)
      ),
      'react': fileURLToPath(new URL('./node_modules/react', import.meta.url)),
      'react-dom': fileURLToPath(new URL('./node_modules/react-dom', import.meta.url)),
      'react-router-dom': fileURLToPath(new URL('./node_modules/react-router-dom', import.meta.url)),
      'axios': fileURLToPath(new URL('./node_modules/axios', import.meta.url)),
      'clsx': fileURLToPath(new URL('./node_modules/clsx', import.meta.url)),
      'lucide-react': fileURLToPath(new URL('./node_modules/lucide-react', import.meta.url)),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'axios', 'clsx'],
    preserveSymlinks: true,
  },
  server: {
    port: 5173,
    fs: {
      allow: [fileURLToPath(new URL('../..', import.meta.url))],
    },
  },
})
