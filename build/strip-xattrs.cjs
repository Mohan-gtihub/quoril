const { execFileSync } = require('child_process')

// The repo lives under ~/Documents, which iCloud Drive syncs. The file provider
// stamps com.apple.FinderInfo on every bundle directory it creates, and
// `codesign` refuses to sign anything carrying it:
//
//   "resource fork, Finder information, or similar detritus not allowed"
//
// Strip extended attributes after packing, before electron-builder signs.
// com.apple.provenance survives this (it is system-protected) but codesign
// accepts it, so only FinderInfo actually matters here.
//
// This is a safety net, not the real fix: iCloud can re-stamp the bundle at any
// moment, so release builds should use an output directory outside the synced
// tree. See the `release:mac` script.
exports.default = async function stripXattrs(context) {
    if (context.electronPlatformName !== 'darwin') return

    try {
        execFileSync('xattr', ['-rc', context.appOutDir], { stdio: 'ignore' })
    } catch {
        // xattr exits non-zero on attributes it cannot clear (provenance).
        // Signing tolerates those, so this is not fatal.
    }
}
