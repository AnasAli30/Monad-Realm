import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'three': path.resolve('./node_modules/three'),
    },
  },
  optimizeDeps: {
    include: ['three'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
