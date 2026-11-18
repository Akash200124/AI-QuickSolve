import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron',
      lib: {
        entry: resolve(__dirname, 'desktop/main.ts')
      }
    },
    resolve: {
      alias: {
        '@desktop': resolve(__dirname, 'desktop')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron',
      lib: {
        entry: resolve(__dirname, 'desktop/preload.ts')
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'frontend'),
    build: {
      outDir: resolve(__dirname, 'dist'),
      rollupOptions: {
        input: resolve(__dirname, 'frontend/index.html')
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'frontend/src')
      }
    }
  }
})
