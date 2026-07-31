import { defineConfig } from 'vite'

export default defineConfig({
  base: '/mapasescolares-v2/',
  server: {
    watch: {
      usePolling: true
    }
  }
})