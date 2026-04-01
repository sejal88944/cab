import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      srcDir: 'src',
      filename: 'service-worker.js',
      strategies: 'injectManifest',
      includeAssets: ['vite.svg', 'offline.html'],
      manifest: {
        name: 'RideEasy Cab Booking',
        short_name: 'RideEasy',
        description: 'Affordable cab booking for Pune & Kolhapur with RideEasy.',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#10b981',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/maskable-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    allowedHosts: [
      "untransformative-jennine-mesic.ngrok-free.dev"
    ]
  }
})
