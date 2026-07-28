import { readFileSync, existsSync } from 'node:fs'

/**
 * Load .env into process.env for the release scripts.
 *
 * Vite loads .env for the app bundle, but the release tooling (preflight,
 * electron-builder, the notarize hook) are plain Node processes that never saw
 * it — so Apple credentials sitting in .env would silently not apply and the
 * build would fail preflight or ship un-notarized.
 *
 * Real environment variables always win, so CI (which sets them as secrets and
 * has no .env file) is unaffected.
 */
export function loadEnv(file = '.env') {
    if (!existsSync(file)) return

    for (const rawLine of readFileSync(file, 'utf8').split('\n')) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue

        const eq = line.indexOf('=')
        if (eq === -1) continue

        const key = line.slice(0, eq).trim()
        if (!key || key in process.env) continue

        let value = line.slice(eq + 1).trim()
        // Strip a single layer of matching quotes, as dotenv does.
        if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) {
            value = value.slice(1, -1)
        }

        process.env[key] = value
    }
}
