import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
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
