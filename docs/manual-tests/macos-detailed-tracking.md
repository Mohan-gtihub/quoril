# Manual test: macOS detailed tracking

Automated tests cover the logic; they cannot cover macOS itself. Everything
below depends on real TCC behaviour — permission prompts, whether a grant is
visible to a running process, and whether `active-win`'s helper binary is
attributed to Quoril. **None of it is verified by `npm test`.**

Run this against a **signed, installed build** (a CI release build, then
install the DMG). A `npm run dev` build is a different binary with a different
signing identity, so its permission grants say nothing about the shipped app.

## Reset between runs

TCC remembers decisions per bundle id, so a second run is not a clean test:

```bash
tccutil reset Accessibility com.quoril.in
tccutil reset ScreenCapture com.quoril.in
tccutil reset AppleEvents com.quoril.in
```

Then quit and relaunch Quoril. Confirm both toggles read off in
Settings → App Tracking → Detailed tracking.

---

## 1. Default install collects nothing extra, and never prompts

The most important guarantee: someone who ignores these settings must see no
change and no dialog.

- [ ] Fresh install, both toggles off. Use the machine normally for ~5 minutes.
- [ ] **No permission dialog appears at any point.**
- [ ] Screen Time still lists apps with times.
- [ ] Websites card reads "Website breakdown is off".
- [ ] `log show --predicate 'subsystem == "com.apple.TCC"' --last 5m | grep -i quoril`
      shows no access requests.

## 2. Website addresses (Accessibility)

- [ ] Toggle **Website addresses** on. macOS prompts for Accessibility.
- [ ] **Deny it.** Toggle stays on, card reads "Waiting on Accessibility
      permission", nothing is collected.
- [ ] Grant it in System Settings → Privacy & Security → Accessibility.
- [ ] **Without touching Quoril**, wait ~5s. Does the card clear itself?
      - Yes → polling is sufficient.
      - No → click "Already granted it? Restart Quoril". **Record this**: it
        means `AXIsProcessTrusted()` is cached per process and the restart
        prompt should become automatic rather than optional.
- [ ] Browse two distinct sites (e.g. github.com, youtube.com) for ~1 min each.
- [ ] Screen Time → Websites lists both by hostname, not one "Chrome" block.
- [ ] Known sites show friendly names ("GitHub", "YouTube") and correct
      categories; an unknown site shows a bare hostname under "Web".
- [ ] `about:blank` / a `file://` page / `chrome://settings` do **not** appear.

Repeat in Safari and one Chromium browser — the URL path is per-browser
AppleScript, so support differs.

## 3. Window titles (Screen Recording)

- [ ] Toggle **Window titles** on. Expect **no inline prompt** — Screen
      Recording has no request API. System Settings should open.
- [ ] Grant it, return to Quoril.
- [ ] Confirm the restart prompt appears and that titles are **still empty**
      until you actually restart. (If titles appear without a restart, the
      relaunch requirement is wrong and the prompt should be dropped.)
- [ ] After restart, the Screen Time timeline shows real window titles.

## 4. Revocation degrades quietly

- [ ] With Website addresses live, revoke Accessibility in System Settings.
- [ ] Quoril keeps recording app names and does **not** re-prompt.
- [ ] Card returns to "Waiting on permission"; the toggle stays on.
- [ ] No error dialog or crash.

## 5. Independence

- [ ] Enable **only** window titles. Websites card must say it is off — not
      show an empty list. (This was a real bug: the panel keyed off the
      combined flag.)
- [ ] Enable **only** website addresses. Timeline shows no titles.

## 6. Deep link

- [ ] From Screen Time → Websites, click "Open settings".
- [ ] Lands on **App Tracking**, not Appearance.

## 7. Upgrade path

The one thing worth testing on a real update rather than a fresh install:

- [ ] Install the previous version, grant Accessibility, confirm it works.
- [ ] Update via the in-app updater.
- [ ] **The grant survives.** If it does not, the TCC identity is changing
      between builds — check that the signing identity and bundle id are
      stable, since that was the original reason this feature was disabled.

## What to report back

For any box that fails, note the macOS version, the browser, and whether the
build was signed. The restart question in §2 is the most valuable single
answer: it decides whether the restart prompt stays optional or becomes part
of the normal flow.
