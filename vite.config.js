import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    minify: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|loose-envify|object-assign|js-tokens)/.test(id)) return 'react-vendor';
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)/.test(id)) return 'motion';
          if (/node_modules\/react-icons/.test(id)) return 'icons';
          if (/node_modules\/react-calendar|get-user-locale|warning|memoize/.test(id)) return 'calendar';
        },
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          if (/\.(webp|png|jpe?g|gif|svg|avif)$/.test(name)) {
            return 'assets/img/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
})
