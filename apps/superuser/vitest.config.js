import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react': fileURLToPath(new URL('./node_modules/react', import.meta.url)),
      'react-dom': fileURLToPath(new URL('./node_modules/react-dom', import.meta.url)),
      'react-router-dom': fileURLToPath(new URL('./node_modules/react-router-dom', import.meta.url)),
      'axios': fileURLToPath(new URL('./node_modules/axios', import.meta.url)),
      'clsx': fileURLToPath(new URL('./node_modules/clsx', import.meta.url)),
      'lucide-react': fileURLToPath(new URL('./node_modules/lucide-react', import.meta.url)),
    },
    preserveSymlinks: true,
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  test: { environment: 'jsdom', setupFiles: ['./tests/components/setup.js'], include: ['tests/components/**/*.test.jsx'], clearMocks: true },
});
