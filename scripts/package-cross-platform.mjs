import { execFileSync } from 'node:child_process'
import process from 'node:process'

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
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
    let packageError = null

    try {
        execFileSync(npx, ['electron-builder', ...args], { cwd: process.cwd(), stdio: 'inherit' })
    } catch (error) {
        packageError = error
    } finally {
        console.log(`Restoring Electron native dependencies for ${process.platform}/${process.arch}...`)
        execFileSync(npx, ['electron-builder', 'install-app-deps'], { cwd: process.cwd(), stdio: 'inherit' })
    }

    if (packageError) {
        process.exitCode = typeof packageError.status === 'number' ? packageError.status : 1
    }
}
