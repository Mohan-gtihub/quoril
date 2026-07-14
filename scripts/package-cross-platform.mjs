import { execFileSync } from 'node:child_process'
import process from 'node:process'

const target = process.argv[2]
const configs = {
    win: ['--win', '--x64', '--publish', 'never'],
    linux: ['--linux', '--x64', '--publish', 'never'],
}
const args = configs[target]

function runElectronBuilder(commandArgs) {
    if (process.platform === 'win32') {
        const psCommand = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `npm exec -- electron-builder ${commandArgs.join(' ')}`]
        execFileSync('powershell.exe', psCommand, {
            cwd: process.cwd(),
            stdio: 'inherit',
            env: process.env,
        })
    } else {
        execFileSync('npm', ['exec', '--', 'electron-builder', ...commandArgs], {
            cwd: process.cwd(),
            stdio: 'inherit',
            env: process.env,
        })
    }
}

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
        runElectronBuilder(['install-app-deps'])
    }

    if (packageError) {
        process.exitCode = typeof packageError.status === 'number' ? packageError.status : 1
    }
}
