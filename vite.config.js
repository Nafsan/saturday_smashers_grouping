import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: process.env.VERCEL ? '/' : '/saturday_smashers_grouping/', // IMPORTANT: Replace with your repository name
})
