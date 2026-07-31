# Releasing Quoril

```
npm run release            # patch: 1.1.6 -> 1.1.7
npm run release -- minor   # 1.1.6 -> 1.2.0
npm run release -- 2.0.0   # explicit
npm run release -- --dry-run
```

That is the whole procedure. The script bumps the version, promotes
`## [Unreleased]` in CHANGELOG.md into a dated section, commits, tags and
pushes. CI does the rest.

Watch it with `gh run watch`. A release takes roughly 15-25 minutes, almost all
of it Apple's notarization queue.

## What CI does

```
verify ──> draft ──> build ┬─ macOS   (universal, signed, notarized)
                           ├─ Windows (NSIS)
                           └─ Linux   (AppImage)
                                 │
                                 └──> publish
```

- **verify** — checks the tag matches `package.json`, then runs the lockfile
  check, typecheck, lint and tests. Nothing is built until these pass.
- **draft** — creates a draft GitHub release from the changelog section, so the
  three build jobs attach to one release instead of racing to create it.
- **build** — each platform on its own runner, because `better-sqlite3` and
  `active-win` ship native binaries compiled for the host. Uploads to the draft.
- **publish** — flips the draft live, but only after confirming all three update
  feeds (`latest-mac.yml`, `latest.yml`, `latest-linux.yml`) are present.

Until `publish` runs, the release is invisible to users and to every installed
copy's updater. A failed platform therefore leaves a draft to fix and re-run,
never a half-published release.

## Required secrets

Set these in **Settings → Secrets and variables → Actions**.

| Secret | Used for |
| --- | --- |
| `MACOS_CSC_LINK` | Developer ID certificate, base64-encoded `.p12` |
| `MACOS_CSC_KEY_PASSWORD` | password for that `.p12` |
| `APPLE_ID` | Apple account email used for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | from appleid.apple.com → Sign-In and Security → App-Specific Passwords |
| `APPLE_TEAM_ID` | 10-character team ID from the Apple Developer account page |
| `WINDOWS_CSC_LINK` | *optional* — base64 `.pfx`; without it the installer is unsigned |
| `WINDOWS_CSC_KEY_PASSWORD` | *optional* — password for that `.pfx` |

`GITHUB_TOKEN` is provided by Actions; nothing to configure.

### Exporting the macOS certificate

1. Keychain Access → **My Certificates** → right-click *Developer ID
   Application: …* → **Export** → save as `cert.p12` with a password.
2. `base64 -i cert.p12 | pbcopy`
3. Paste as `MACOS_CSC_LINK`; the password becomes `MACOS_CSC_KEY_PASSWORD`.

Certificates expire after five years. When one does, every release fails at the
signing step with a clear error — re-export and update the two secrets.

### Why macOS signing is not optional

Gatekeeper refuses to auto-update an unsigned app. An unsigned macOS build would
install once and then never update again, silently, so the workflow fails
outright rather than shipping one. Windows is different: NSIS installs and
auto-updates unsigned, users just see a SmartScreen warning on first run.

## macOS is a universal binary

One `.dmg` runs natively on both Intel and Apple Silicon. Through v1.1.6 two
per-architecture builds shipped instead, and the Intel one was the shortest,
most obviously-clickable asset on the release page — Apple Silicon users kept
downloading it and being asked to install Rosetta.

The build verifies this rather than assuming it: `@electron/universal` silently
falls back to the x64 copy of any Mach-O it cannot merge, which would put Apple
Silicon users back on Rosetta with nothing having failed. Every `.node` and
`.dylib` in the bundle is checked with `lipo -archs` for both slices.

`latest-mac.yml` is also checked for the substring `arm64`. electron-updater
filters candidate downloads by that substring; a universal feed must contain no
file that has it, or Intel Macs match nothing and fail with
`ERR_UPDATER_ZIP_FILE_NOT_FOUND`.

## When something fails

**A build job failed.** Fix it, then re-run that job from the Actions page. It
uploads to the same draft; the other two platforms' artifacts are still there.

**The tag is wrong or the code was bad.** Delete the draft and the tag, then
release again:

```
gh release delete v1.2.0 --yes
git push origin :v1.2.0 && git tag -d v1.2.0
```

Safe as long as the release was still a draft — no user or updater ever saw it.

**A published version needs a fix.** Never re-tag. Republishing overwrites the
release's assets, leaving two different binaries under one version number, and
clients that already updated never re-download. Cut a new patch instead.

## Local builds

`npm run build` packages for the machine you are on, unsigned, into `release/`.
That is for trying the packaged app — it never touches GitHub.

Cross-building is not supported: native modules are compiled for the host, so a
Windows build produced on a Mac fails at runtime rather than at build time. Use
CI, which has a real runner per platform.

> On a Mac, note that `~/Documents` is synced by iCloud Drive, which stamps
> `com.apple.FinderInfo` onto bundle directories as they are created. `codesign`
> then refuses to sign them ("resource fork, Finder information, or similar
> detritus not allowed"), and stripping the attribute does not help because
> iCloud re-stamps it mid-build. Signed local builds need a working copy outside
> the synced tree. CI runners have no iCloud, so this never affects a release.
