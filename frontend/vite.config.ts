// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    // You can keep this or remove it; @vite works either way in prod
    base: '/build/',
    build: {
        outDir: path.resolve(__dirname, '../backend/public/build'),
        emptyOutDir: true,
        /**
         * IMPORTANT: Put the manifest at the root so Laravel finds it:
         *   public/build/manifest.json
         */
        manifest: 'manifest.json', // <— change from true to 'manifest.json'
        assetsDir: 'assets',
    },

    server: {
        port: 5173,
        proxy: {
            '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
        },
    },
})
