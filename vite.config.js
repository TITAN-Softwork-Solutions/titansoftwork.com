import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',          // custom domain
  build: {
    outDir: 'docs',   // output directly to docs/
    emptyOutDir: true
  }
})