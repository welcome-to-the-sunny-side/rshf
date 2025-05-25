import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 10000,
    strictPort: true,
    host: true, // Listen on all addresses
    allowedHosts: ['rshf-frontend.onrender.com', 'rshf.net'],
  },
});
