import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'icons/*.png'],
            manifest: {
                name: 'CarrySpanner',
                short_name: 'MechERP',
                description: 'Offline-first ERP for automotive workshops',
                theme_color: '#7c3aed',
                background_color: '#0d1117',
                display: 'standalone',
                start_url: '/dashboard',
                scope: '/',
                orientation: 'portrait-primary',
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
                        src: '/icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^http:\/\/localhost:8000\/api\/v1\/job-cards/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'job-cards-cache',
                            expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
                            networkTimeoutSeconds: 5
                        }
                    },
                    {
                        urlPattern: /^http:\/\/localhost:8000\/api\/v1\/vehicles/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'vehicles-cache',
                            expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
                            networkTimeoutSeconds: 5
                        }
                    },
                    {
                        urlPattern: /^http:\/\/localhost:8000\/api\/v1\/subscriptions/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'subscriptions-cache',
                            expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
                            networkTimeoutSeconds: 5
                        }
                    }
                ]
            }
        })
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true
            }
        }
    }
})
