const { notarize } = require('@electron/notarize')
const path = require('path')

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context
    if (electronPlatformName !== 'darwin') return

    // Skip if credentials aren't provided (e.g. local dev builds)
    if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD || !process.env.APPLE_TEAM_ID) {
        console.warn('Skipping notarization: APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID not set')
        return
    }

    const appName = context.packager.appInfo.productFilename

    console.log(`Notarizing ${appName}...`)
    await notarize({
        appPath: path.join(appOutDir, `${appName}.app`),
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID,
    })
    console.log(`Notarized ${appName}`)
}
