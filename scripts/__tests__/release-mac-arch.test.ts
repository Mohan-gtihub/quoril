import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * v1.0.0 through v1.1.2 shipped arm64 only, so every Intel Mac had no download
 * and no update path — and nothing failed, because a single-arch build is
 * perfectly valid. These assertions make dropping an architecture noisy.
 */
const RELEASE_MAC = readFileSync('scripts/release-mac.mjs', 'utf8')
const WORKFLOW = readFileSync('.github/workflows/release-verify.yml', 'utf8')
const PKG = JSON.parse(readFileSync('package.json', 'utf8'))

describe('macOS release covers both architectures', () => {
    it('builds arm64 and x64', () => {
        expect(RELEASE_MAC).toMatch(/'--arm64'/)
        expect(RELEASE_MAC).toMatch(/'--x64'/)
    })

    it('CI verifies signing and notarization for both, not just arm64', () => {
        expect(WORKFLOW).toContain('release/mac-arm64/Quoril.app')
        expect(WORKFLOW).toContain('release/mac/Quoril.app')
    })

    it('CI fails if the update feed has no x64 entry', () => {
        expect(WORKFLOW).toMatch(/Intel Macs would get no update/)
    })
})

/**
 * electron-updater's MacUpdater.filterFilesForArch decides which download an
 * Intel Mac gets purely by looking for the substring "arm64" in the file name.
 * A mac artifactName that stamped the arch onto every file — or worse, put
 * "arm64" in the x64 name — would make Intel Macs skip every file and fail with
 * ERR_UPDATER_ZIP_FILE_NOT_FOUND.
 */
describe('mac artifact naming stays compatible with arch selection', () => {
    it('does not override the mac artifactName', () => {
        expect(PKG.build.mac?.artifactName).toBeUndefined()
    })

    it('ships a zip, which is the only format the mac updater consumes', () => {
        expect(PKG.build.mac.target).toContain('zip')
    })
})
