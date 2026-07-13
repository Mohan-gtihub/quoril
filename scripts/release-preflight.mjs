import process from 'node:process'

const target = process.argv[2]
const validTargets = new Set(['mac', 'win'])

if (!validTargets.has(target)) {
    console.error('Usage: node scripts/release-preflight.mjs <mac|win>')
    process.exitCode = 1
} else {
    const required = target === 'mac'
        ? ['QUORIL_RELEASE_BUILD', 'CSC_LINK', 'CSC_KEY_PASSWORD', 'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID']
        : ['QUORIL_RELEASE_BUILD', 'CSC_LINK', 'CSC_KEY_PASSWORD']

    const missing = required.filter((key) => !process.env[key])
    if (missing.length > 0) {
        console.error(`${target} release preflight failed. Missing: ${missing.join(', ')}`)
        process.exitCode = 1
    } else if (process.env.QUORIL_RELEASE_BUILD !== 'true') {
        console.error('Release preflight requires QUORIL_RELEASE_BUILD=true.')
        process.exitCode = 1
    } else {
        console.log(`${target} release preflight passed.`)
    }
}
