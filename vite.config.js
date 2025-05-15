import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import crx from 'vite-plugin-crx-mv3'

// Path to your extension manifest (moved to project root)
const manifestPath = './manifest.json'

export default defineConfig({
  root: '.',            // project root where index.html lives
  plugins: [
    vue(),
    crx({ manifest: manifestPath })
  ],

  // Ensure papaparse is pre-bundled for both dev and build
  optimizeDeps: {
    include: ['papaparse']
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // If instead you want papaparse to remain external (not bundled), uncomment:
      // external: ['papaparse']
    }
  }
})
