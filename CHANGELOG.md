# Changelog

All notable user-facing changes to Quoril are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
Quoril adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each released section below is the exact text published as that version's GitHub
release body, which is also what the in-app update prompt shows. `scripts/release-notes.mjs`
extracts it — so this file is the single source of truth for "what changed".

## [Unreleased]

## [1.1.1] - 2026-07-27

### Fixed

- The Websites panel no longer claims per-site breakdowns are unavailable on
  macOS. It now says whether the setting is off or waiting on permission, and
  links straight to it.

## [1.1.0] - 2026-07-27

Version 1.0.8 was prepared but never published, so its changes ship here.

### Added

- Detailed screen-time tracking on macOS, as two independent opt-ins. **Website
  addresses** breaks browser time into the sites you actually visited instead of
  one block per browser; **window titles** records the active window's title.
  Both are off by default, and everything they collect stays in the local
  database on this device — none of it is uploaded.
- Sites are now identified from the browser's real address rather than guessed
  from the window title, so every site is recognised instead of the 28 that were
  hardcoded.
- Update prompts now show what's actually in a release. The "Update available"
  card and the Settings updater panel both list the release notes, so you can
  see what you're getting before spending the bandwidth.
- Downloads are opt-in. Quoril no longer pulls an update in the background the
  moment it finds one — it asks first, and you pick the moment.
- "Check for updates" in Settings now always answers, including when you are
  already on the latest version.

### Fixed

- Restarting to install an update no longer leaves the app running in the tray,
  which previously caused the installer to skip the relaunch and, on some
  machines, apply the update silently or not at all.
- Transient network failures during a background update check no longer surface
  an error card. A check that fails because wifi is not up yet stays quiet; a
  check you asked for still reports the problem.

### Changed

- App-name tracking is unchanged and still needs no permission. With neither
  opt-in enabled, macOS behaves exactly as before and no permission prompt is
  ever shown.
- Update activity is now written to `~/Library/Logs/Quoril/updater.log`
  (and the OS equivalent elsewhere), so a failed update can be diagnosed after
  the fact instead of vanishing into a packaged app with no console.

## [1.0.7] - 2026-07-26

### Fixed

- macOS builds are signed and notarized correctly, so auto-update is no longer
  blocked by Gatekeeper.

[Unreleased]: https://github.com/Mohan-gtihub/quoril/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/Mohan-gtihub/quoril/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/Mohan-gtihub/quoril/compare/v1.0.7...v1.1.0
[1.0.7]: https://github.com/Mohan-gtihub/quoril/releases/tag/v1.0.7
