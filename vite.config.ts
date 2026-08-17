import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/news': {
        target: 'https://circuito-interno.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
