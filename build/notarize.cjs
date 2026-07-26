const path = require('path')
const { execFileSync } = require('child_process')

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context
    // Notarization is macOS-only. Return before touching @electron/notarize so
    // non-mac builds (Linux/Windows) never load it — it ships as an ES Module and
    // a top-level require() of it throws ERR_REQUIRE_ESM under CommonJS.
    if (electronPlatformName !== 'darwin') return

    // Loaded lazily (dynamic import) because the package is ESM-only.
    const { notarize } = await import('@electron/notarize')

    // Local package builds remain useful without Apple credentials. A release
    // build must never silently ship without notarization evidence.
    if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD || !process.env.APPLE_TEAM_ID) {
        if (process.env.QUORIL_RELEASE_BUILD === 'true') {
            throw new Error('Release notarization requires APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID')
        }
        console.warn('Skipping notarization: APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID not set')
        return
    }

    const appName = context.packager.appInfo.productFilename

    const appPath = path.join(appOutDir, `${appName}.app`)

    console.log(`Notarizing ${appName}...`)
    await notarize({
        appPath,
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID,
    })
    console.log(`Notarized ${appName}`)

    // Staple the ticket into the .app before the DMG/ZIP are built from it, so
    // the shipped bundle validates without a round trip to Apple's servers.
    console.log(`Stapling ticket to ${appName}.app...`)
    execFileSync('xcrun', ['stapler', 'staple', appPath], { stdio: 'inherit' })
}
