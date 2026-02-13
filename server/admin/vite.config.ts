import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // 生产环境使用 /admin/ 作为 base
  base: '/admin/',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: process.env.VITE_API_DOMAIN || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
