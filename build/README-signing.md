# macOS code signing & the repeated Accessibility prompt

## Why it happened

Quoril uses [`active-win`](https://www.npmjs.com/package/active-win) to track the
active app/window, which requires macOS **Accessibility** permission. macOS stores
that grant in its TCC privacy database keyed to the app's **code signature**.

The previous builds were left with the raw Electron ad-hoc signature:

```
codesign -dvvv release/mac-arm64/Quoril.app
  Identifier=Electron        # should be com.quoril.app
  Signature=adhoc
  Info.plist=not bound       # signature doesn't seal the bundle
```

Because the signature identifier was `Electron` (not `com.quoril.app`) and the
bundle wasn't sealed, macOS could never match the granted permission back to the
running process — so it re-prompted on every launch.

## The fix

`package.json > build.mac` now enables `hardenedRuntime`, a real entitlements file
(`build/entitlements.mac.plist`), and the proper `NSAccessibilityUsageDescription`.
But electron-builder needs a **signing identity** to produce a bound signature.

### Option A — Self-signed cert (free, personal / internal use)

```bash
bash build/create-self-signed-cert.sh          # run once per machine
CSC_NAME="Quoril Self Signed" npm run dist:mac
```

This yields a stable signature with the correct `com.quoril.app` identifier, so the
Accessibility/Microphone grant persists across launches of the same build.

Verify:

```bash
codesign -dvvv "release/mac-arm64/Quoril.app"
# Identifier=com.quoril.app, Sealed Resources=... , Info.plist bound
```

> Self-signed builds still show Gatekeeper's "unidentified developer" warning on
> machines other than the one that built them. That's expected without notarization.

### Option B — Developer ID + notarization (public distribution)

Requires a paid Apple Developer account. With a "Developer ID Application"
certificate in your keychain, `npm run dist:mac` signs automatically. Add
notarization (Apple ID app-specific password or API key) so the grant survives
across machines and Gatekeeper is satisfied:

```jsonc
// package.json > build.mac
"notarize": { "teamId": "YOURTEAMID" }
```
with `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` (or `APPLE_API_KEY`) in the env.

## After reinstalling, reset a stale grant once

If the old broken build already polluted TCC, remove the stale entry before
installing the newly signed build:

```bash
tccutil reset Accessibility com.quoril.app
```
