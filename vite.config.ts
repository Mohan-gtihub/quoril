import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'path'

import pkg from './package.json'

const isWeb = process.env.VITE_TARGET === 'web'

// https://vitejs.dev/config/
export default defineConfig({
    // Only explicitly-public Supabase settings may enter the renderer bundle.
    // This keeps accidentally named VITE_* credentials out of web builds.
    envPrefix: 'VITE_SUPABASE_',
    define: {
        __VITE_TARGET__: JSON.stringify(process.env.VITE_TARGET ?? 'electron'),
        __APP_VERSION__: JSON.stringify(pkg.version ?? '0.0.0'),
    },
    plugins: [
        react(),
        ...(isWeb ? [] : [electron({
            main: {
                // NOTE: `entry` is intentionally omitted here. When set, the
                // plugin injects its own `build.lib` with formats based on
                // package.json "type" (which is "module" → ESM). Vite's
                // mergeConfig concatenates the `formats` arrays, producing a
                // duplicate ESM build that overwrites our CJS output. By
                // omitting `entry` and defining `build.lib` ourselves below,
                // we get a single, clean CommonJS build — required because
                // Electron's `electron` module is CJS.
                entry: undefined as unknown as string,
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        lib: {
                            entry: 'electron/main/index.ts',
                            formats: ['cjs'],
                            fileName: () => 'index.cjs',
                        },
                        rollupOptions: {
                            external: [
                                ...Object.keys(pkg.dependencies || {}),
                                'electron',
                                'better-sqlite3',
                                'active-win'
                            ],
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
        })]),
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
        sourcemap: true, // Enable source maps for debugging
        rollupOptions: {
            external: ['better-sqlite3'],
        },
    },
    server: {
        port: 5173,
        strictPort: true,
        open: false, // Don't open browser automatically
    },
    css: {
        devSourcemap: true, // Enable CSS source maps
    },
    optimizeDeps: {
        exclude: ['better-sqlite3', 'active-win'],
    },
})
