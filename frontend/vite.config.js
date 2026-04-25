import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { injectManifest } from 'workbox-build'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { build as rollupBuild } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

function workboxPlugin() {
  return {
    name: 'workbox-inject-manifest',
    apply: 'build',
    enforce: 'post',
    async closeBundle() {
      await rollupBuild({
        configFile: false,
        define: {
          'process.env.NODE_ENV': '"production"',
        },
        build: {
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, 'src/sw.js'),
            formats: ['iife'],
            name: 'sw',
            fileName: () => 'sw-raw.js',
          },
          outDir: resolve(__dirname, 'dist'),
        },
        plugins: [],
        logLevel: 'warn',
      })

      await injectManifest({
        swSrc: resolve(__dirname, 'dist/sw-raw.js'),
        swDest: resolve(__dirname, 'dist/sw.js'),
        globDirectory: resolve(__dirname, 'dist'),
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['sw.js', 'sw-raw.js'],
      })

      const { unlinkSync } = await import('fs')
      try { unlinkSync(resolve(__dirname, 'dist/sw-raw.js')) } catch { /* cleanup is best-effort */ }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), workboxPlugin()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
  },
})
