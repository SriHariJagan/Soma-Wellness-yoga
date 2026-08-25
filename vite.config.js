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
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|loose-envify|object-assign|js-tokens)/,
              priority: 50,
              minSize: 0,
            },
            {
              name: 'motion',
              test: /node_modules\/(framer-motion|motion-dom|motion-utils)/,
              priority: 40,
              minSize: 0,
            },
            {
              name: 'icons',
              test: /node_modules\/react-icons/,
              priority: 40,
              minSize: 0,
            },
            {
              name: 'calendar',
              test: /node_modules\/react-calendar|get-user-locale|warning|memoize/,
              priority: 40,
              minSize: 0,
            },
          ],
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
