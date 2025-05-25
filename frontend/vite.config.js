import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: true,
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
