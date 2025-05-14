import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import crx from 'vite-plugin-crx-mv3'

export default defineConfig({
  root: '.',
  plugins: [
    vue(),
    crx({ manifest: 'public/manifest.json' })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
