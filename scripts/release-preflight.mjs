import { execFileSync } from 'node:child_process'
import process from 'node:process'

const target = process.argv[2]
const validTargets = new Set(['mac', 'win'])

// CI must always sign from an explicit .p12 (CSC_LINK) so the build is
// reproducible off any runner. On a developer's own Mac the Developer ID lives
// in the login keychain, which electron-builder picks up without CSC_LINK — so
// there a valid keychain identity is accepted in its place.
const isCI = process.env.CI === 'true' || process.env.CI === '1'

function keychainIdentity() {
    try {
        const out = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning'], {
            encoding: 'utf8',
        })
        const match = out.match(/"(Developer ID Application: [^"]+)"/)
        return match ? match[1] : null
    } catch {
        return null
    }
}

if (!validTargets.has(target)) {
    console.error('Usage: node scripts/release-preflight.mjs <mac|win>')
    process.exitCode = 1
} else {
    const signingFromKeychain =
        target === 'mac' && !isCI && !process.env.CSC_LINK && process.platform === 'darwin'

    let identity = null
    if (signingFromKeychain) {
        identity = keychainIdentity()
    }

    const certVars = signingFromKeychain ? [] : ['CSC_LINK', 'CSC_KEY_PASSWORD']
    const required = target === 'mac'
        ? ['QUORIL_RELEASE_BUILD', ...certVars, 'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID']
        : ['QUORIL_RELEASE_BUILD', ...certVars]

    const missing = required.filter((key) => !process.env[key])

    if (signingFromKeychain && !identity) {
        console.error(
            'mac release preflight failed. No CSC_LINK set and no "Developer ID Application" identity found in the keychain.'
        )
        process.exitCode = 1
    } else if (missing.length > 0) {
        console.error(`${target} release preflight failed. Missing: ${missing.join(', ')}`)
        process.exitCode = 1
    } else if (process.env.QUORIL_RELEASE_BUILD !== 'true') {
        console.error('Release preflight requires QUORIL_RELEASE_BUILD=true.')
        process.exitCode = 1
    } else {
        if (identity) {
            console.log(`Signing from keychain identity: ${identity}`)
        }
        console.log(`${target} release preflight passed.`)
    }
}
