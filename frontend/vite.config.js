import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Generate manifest for production builds
    manifest: true,
    // Ensure service worker is copied to dist
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  // Ensure public assets are properly served
  publicDir: 'public',
})
