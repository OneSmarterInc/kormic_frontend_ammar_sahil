import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  resolve: { preserveSymlinks: true, dedupe: ['react', 'react-dom', 'react-router-dom'] },
  test: { environment: 'jsdom', setupFiles: ['./tests/components/setup.js'], include: ['tests/components/**/*.test.jsx'], clearMocks: true },
});
