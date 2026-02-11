import { defineConfig } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readdirSync, statSync, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

function getGeneratedBlogInputs() {
  const blogRoot = resolve(__dirname, 'blog')
  if (!existsSync(blogRoot)) return {}

  const inputs = {}
  const entries = readdirSync(blogRoot, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const indexPath = resolve(blogRoot, entry.name, 'index.html')
    if (!existsSync(indexPath) || !statSync(indexPath).isFile()) continue
    inputs[`blog-${entry.name}`] = indexPath
  }
  return inputs
}

export default defineConfig({
  base: '/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        blog: resolve(__dirname, 'blog/index.html'),
        ...getGeneratedBlogInputs()
      }
    }
  }
})
