import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import crx from 'vite-plugin-crx-mv3'            // default export!
import manifest from './public/manifest.json' with { type: 'json' };

export default defineConfig({
  plugins: [
    vue(),
    crx({ manifest: './public/manifest.json' })                         // собирает dist/
  ],
  build: {
    target: 'es2022',                           // Node 22 поддерживает
    sourcemap: false
  }
})
