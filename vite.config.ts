import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        electron({
            main: {
                entry: 'electron/main/index.ts',
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        rollupOptions: {
                            external: ['better-sqlite3'],
                        },
                    },
                },
            },
            preload: {
                input: 'electron/preload/index.ts',
                vite: {
                    build: {
                        outDir: 'dist-electron',
                    },
                },
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@/components': path.resolve(__dirname, './src/components'),
            '@/store': path.resolve(__dirname, './src/store'),
            '@/services': path.resolve(__dirname, './src/services'),
            '@/hooks': path.resolve(__dirname, './src/hooks'),
            '@/types': path.resolve(__dirname, './src/types'),
            '@/utils': path.resolve(__dirname, './src/utils'),
        },
    },
    base: './',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            external: ['better-sqlite3'],
        },
    },
    server: {
        port: 5173,
        strictPort: true,
    },
})
