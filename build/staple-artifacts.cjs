const { execFileSync } = require('child_process')

// The .app is stapled in afterSign, but the DMG is a separate container that
// carries its own ticket. Staple it too so a downloaded DMG passes Gatekeeper
// on a machine that is offline or behind a firewall.
exports.default = async function stapleArtifacts(buildResult) {
    if (process.platform !== 'darwin') return

    // Notarization is skipped for local non-release builds; nothing to staple.
    if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD || !process.env.APPLE_TEAM_ID) {
        return
    }

    const dmgs = (buildResult.artifactPaths || []).filter((p) => p.endsWith('.dmg'))

    for (const dmg of dmgs) {
        console.log(`Stapling ticket to ${dmg}...`)
        execFileSync('xcrun', ['stapler', 'staple', dmg], { stdio: 'inherit' })
    }
}
