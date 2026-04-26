import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.png', 'assets/cover.png'],
            manifest: {
                name: 'Saturday Smashers',
                short_name: 'Saturday Smashers',
                description: 'Private Table Tennis Group Tournament & Fund Management and Statistics Tracker',
                theme_color: '#0f172a',
                background_color: '#0f172a',
                display: 'standalone',
                orientation: 'portrait',
                icons: [
                    {
                        src: 'favicon.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'favicon.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'favicon.png',
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
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    }
                ]
            },
            devOptions: {
                enabled: true
            }
        })
    ],
    base: process.env.VERCEL ? '/' : '/saturday_smashers_grouping/', // IMPORTANT: Replace with your repository name
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom', '@reduxjs/toolkit', 'react-redux'],
                    ui: ['@mui/material', '@emotion/react', '@emotion/styled', 'lucide-react'],
                    charts: ['recharts'],
                    editor: ['@uiw/react-md-editor', 'react-markdown'],
                    utils: ['html-to-image', 'react-easy-crop']
                }
            }
        }
    }
})
