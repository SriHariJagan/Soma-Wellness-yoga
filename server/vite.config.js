// vite.config.js
import { defineConfig } from 'vite';
import react from '@vite react-plugin';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Your Express port
        changeOrigin: true,
        secure: false,
      }
    }
  }
});