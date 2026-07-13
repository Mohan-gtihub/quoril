# Release Signing

Production releases are built only through the release commands. They reject missing credentials before packaging and never use a self-signed Windows certificate.

## macOS

`npm run release:mac` requires:

```sh
QUORIL_RELEASE_BUILD=true
CSC_LINK=base64-or-file-url-to-developer-id-p12
CSC_KEY_PASSWORD=developer-id-certificate-password
APPLE_ID=apple-id-email
APPLE_APP_SPECIFIC_PASSWORD=app-specific-password
APPLE_TEAM_ID=apple-team-id
```

The command builds an arm64 package, signs it with Developer ID, notarizes it, then CI verifies its signature and stapled notarization ticket.

## Windows

`npm run release:win` requires:

```sh
QUORIL_RELEASE_BUILD=true
CSC_LINK=base64-or-file-url-to-authenticode-pfx
CSC_KEY_PASSWORD=authenticode-certificate-password
```

The command builds an x64 NSIS installer. CI validates it with `Get-AuthenticodeSignature` and fails unless Windows reports `Valid`.

## CI secrets

Configure the following repository secrets before dispatching `.github/workflows/release-verify.yml`:

- `MACOS_CSC_LINK`
- `MACOS_CSC_KEY_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`
- `WINDOWS_CSC_LINK`
- `WINDOWS_CSC_KEY_PASSWORD`

The workflow verifies signed artifacts but does not publish a GitHub release. Publishing stays a separate, deliberate release action after artifact and clean-machine checks pass.

## Local cross-platform packaging

Use `npm run package:win` or `npm run package:linux` for local cross-target packages. The package wrapper restores the host's Electron-native modules even when packaging fails, so a Windows or Linux `better-sqlite3` binary is not left behind to break local development on macOS.
