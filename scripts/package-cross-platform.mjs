import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import process from 'node:process'

// Resolve electron-builder's JS entry point and run it with the current Node
// binary. Spawning the npx.cmd shim instead fails with EINVAL on Windows:
// Node >= 20.12 refuses to execFile .cmd/.bat without a shell (CVE-2024-27980).
const require = createRequire(import.meta.url)
const electronBuilderCli = require.resolve('electron-builder/cli.js')

function runElectronBuilder(builderArgs) {
    execFileSync(process.execPath, [electronBuilderCli, ...builderArgs], {
        cwd: process.cwd(),
        stdio: 'inherit',
    })
}

const target = process.argv[2]
const configs = {
    win: ['--win', '--x64', '--publish', 'never'],
    linux: ['--linux', '--x64', '--publish', 'never'],
}
const args = configs[target]

if (!args) {
    console.error('Usage: node scripts/package-cross-platform.mjs <win|linux>')
    process.exitCode = 1
} else {
    let packageError = null

    try {
        runElectronBuilder(args)
    } catch (error) {
        packageError = error
    } finally {
        console.log(`Restoring Electron native dependencies for ${process.platform}/${process.arch}...`)
        // Never let a restore failure throw out of `finally` -- that would discard
        // packageError and hide why packaging actually failed.
        try {
            runElectronBuilder(['install-app-deps'])
        } catch (restoreError) {
            console.error('Failed to restore native dependencies:', restoreError.message)
            console.error('Run `npx electron-builder install-app-deps` manually before `npm run dev`.')
            if (!packageError) packageError = restoreError
        }
    }

    if (packageError) {
        console.error('\nPackaging failed:', packageError.message)
    }

    if (packageError) {
        process.exitCode = typeof packageError.status === 'number' ? packageError.status : 1
    }
}
