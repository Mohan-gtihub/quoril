# Quoril Production Readiness Roadmap

**Date:** 2026-07-09  
**Status:** Launch readiness contract  
**Owner:** Erik Vale / Quoril team  
**Operating rule:** do not charge money until every launch gate in this document is green.

This document is the source of truth for taking Quoril from a feature-complete desktop prototype
to a paid, signed, self-updating subscription product. It replaces a phase-based roadmap with
pass/fail launch gates. A gate is green only when the acceptance checks pass on a clean install.

The goal is not to add more features. The goal is to make Quoril trust-complete: secure enough,
reliable enough, observable enough, and operationally ready enough to take payment.

---

## 0. Executive Rating

| Dimension | Current rating | Target | Notes |
|---|---:|---:|---|
| Roadmap quality | 7/10 | 10/10 | Strong direction; needed measurable gates and corrected repo facts. |
| Product readiness | 5.5/10 | 10/10 | Feature-rich, but billing, signing, reliability proof, and production ops are incomplete. |

**Lead engineer verdict:** Quoril has enough product surface to launch. It does not yet have enough
trust surface to charge. From now until paid launch, security, sync, billing, signing, backups,
observability, and onboarding outrank all feature work.

---

## 1. Verified Product Inventory

This inventory separates verified facts from partial claims. Recheck it whenever a major launch
gate changes.

| Area | Status | Evidence | Required correction |
|---|---|---|---|
| Task management | Verified built | `src/components/planner` | Harden only if launch flow exposes defects. |
| Focus engine | Verified built | `src/components/focus` | Keep stable; avoid scope expansion. |
| App tracking and idle detection | Partially verified | Electron tracking stack, `SessionManager`, collector code | Platform-specific: macOS currently favors app-level tracking without Accessibility; website/window-title depth is not equal across OSes. |
| Screen-time analytics and reports | Verified built | `src/components/screentime`, `src/components/reports` | Ensure free-tier 7-day cap and Pro unlimited history are enforced safely. |
| Offline-first SQLite | Verified built | Electron local DB and stores | Needs migration, backup, restore, and data-loss tests. |
| Supabase sync | Partially verified | sync services and sync status UI | Needs offline restart, conflict, tombstone, and multi-user tests. |
| Sync status indicator | Verified built | `src/store/syncStore.ts`, title/focus UI | Do not build another indicator; make the existing status trustworthy. |
| Auto-update UI and engine | Verified mostly built | `electron/main/updater.ts`, `UpdateNotification.tsx`, electron-builder config | Needs signed artifacts, release CI, channels, staged rollout, and rollback rehearsal. |
| Subscription entitlements | Schema built only | `supabase/user_roles.sql`, auth hook, `authStore.tier` | Needs provider webhooks, entitlement hook, server-side enforcement, and offline grace. |
| Payment checkout | Missing | no Paddle/Lemon checkout found | Choose Paddle and implement hosted checkout plus webhook. |
| AI insights | Verified built, not hardened | desktop insight bridge and server API route | Move from "future feature" to "existing production surface needing auth, rate limits, gating, and disclosure." |
| Backups | Not built as product backup | `backupService.ts` is not full backup/restore | Build real local backup, restore, and export. |
| Crash reporting | Missing | local crash log only | Add Sentry or equivalent before launch. |
| Product analytics | Missing in desktop app | landing analytics exists separately | Add opt-in, privacy-preserving product analytics. |
| Onboarding | Missing | no full first-run flow found | Build guided first-run to first focus session. |

---

## 2. Strategy

Quoril wins on one sentence:

> Plan the work, enter focus, then see where time actually went.

The durable edges are:

1. **Local-first privacy.** The primary working data lives on-device. Cloud sync and AI should feel
   optional, transparent, and controlled.
2. **Closed-loop productivity.** Quoril connects planned work, actual focused work, and actual
   distraction/time usage.
3. **Native desktop leverage.** Quoril can track and intervene at the OS level in ways a web-only
   planner cannot.

Anything that does not strengthen one of those edges is deferred until after paid launch.

---

## 3. Scope Freeze Until Paid Launch

Allowed before v1.0-paid:

- Security and privacy hardening.
- Supabase RLS and migration reproducibility.
- IPC validation and Electron hardening.
- Billing, trials, entitlements, and paywall UX.
- Data reliability: sync, conflict handling, backup, restore, export, migrations.
- Signed builds, notarization, release channels, auto-update verification.
- Crash reporting, error boundaries, diagnostics, and opt-in analytics.
- First-run onboarding and conversion-critical upgrade prompts.
- Existing AI insights hardening.

Deferred until after v1.0-paid:

- Calendar integration.
- Hard distraction blocking.
- Team/collaboration monetization.
- Mobile app.
- New analytics/reporting formats beyond what is needed for gating.
- New themes/customization beyond current scope.

---

## 4. Launch Gates

Each gate is pass/fail. A gate is green only when its acceptance checks pass and the evidence is
recorded in the release notes or readiness scorecard.

### Gate 0: Truth Audit

**Goal:** make the roadmap, repository, and live environments agree.

**Owner:** Lead engineer  
**Target state:** the team knows what is built, what is partial, what is missing, and what is only
true in local code but not in production infrastructure.

**Acceptance checks**

- [ ] Current feature inventory is verified against the repository.
- [ ] Live Supabase schema and policies are compared against repo SQL.
- [ ] Platform limits are documented: macOS app-level tracking vs deeper tracking on other OSes.
- [ ] Existing AI insight path is documented, including what data leaves the device.
- [ ] Existing sync status UI is documented.
- [ ] Backup/export gaps are documented honestly.
- [ ] All launch blockers are listed in `docs/LAUNCH_BLOCKERS.md`.
- [ ] Readiness score is tracked in `docs/PRODUCTION_READINESS_SCORECARD.md`.

**Exit rule:** no implementation begins from stale claims.

---

### Gate 1: Security And Release Integrity

**Goal:** prevent obvious data leaks, privilege escalation, unsafe IPC, and untrusted release
artifacts.

**Owner:** Engineer A  
**Risk if skipped:** user data exposure, malware-style OS warnings, failed auto-updates, broken
trust.

**Acceptance checks**

- [ ] Supabase migrations are reproducible from a clean project.
- [ ] RLS tests cover owner, collaborator, outsider, and anonymous users.
- [ ] User-private tables block cross-user reads and writes.
- [ ] Collaboration/share tables enforce explicit membership or share-token access only.
- [ ] Public share surfaces have retention, deletion, and privacy rules documented.
- [ ] Desktop bundle contains no service-role keys, LLM provider keys, or secret-shaped `VITE_*`
      variables.
- [ ] Build pipeline includes a bundle/env secret scan.
- [ ] Every write/sync IPC handler validates payload shape in the main process.
- [ ] IPC sender/origin validation is implemented where renderer messages cross trust boundaries.
- [ ] Electron security checklist passes: `contextIsolation`, `nodeIntegration: false`, sandbox
      where possible, navigation blocking, window-open blocking, safe `shell.openExternal`, CSP.
- [ ] macOS entitlements are minimized to what Quoril actually needs.
- [ ] macOS Developer ID signing and notarization succeed in CI.
- [ ] Windows Authenticode signing succeeds in CI with a real certificate.
- [ ] Signed app auto-update is tested on macOS and Windows.

**Evidence**

- RLS test output.
- IPC validation test output.
- Signed build logs.
- Notarization logs.
- Auto-update smoke-test notes.

**Exit rule:** no unsigned or self-signed production build is distributed.

---

### Gate 2: Data Reliability

**Goal:** make local-first data safe under normal failure modes: offline use, app restart, sync
conflict, deletion, and update migration.

**Owner:** Engineer B  
**Risk if skipped:** data loss, duplicated tasks, resurrected deleted records, support burden,
subscription churn.

**Acceptance checks**

- [ ] Offline task, list, subtask, focus session, and settings mutations survive app restart.
- [ ] Offline mutations sync after reconnect.
- [ ] Deleted records do not resurrect after reconnect.
- [ ] Conflict rule is written down. Default launch rule: last-write-wins with tombstone priority
      unless a table has an explicit merge rule.
- [ ] Conflict tests cover same-record edits from two devices.
- [ ] Sync status distinguishes synced, syncing, offline, queued, and error states.
- [ ] Sync errors are recoverable without data loss.
- [ ] SQLite migrations are tested from representative old DB versions.
- [ ] Local backup creates a restorable copy of the SQLite data.
- [ ] Restore flow is tested on a clean install.
- [ ] User export supports JSON and CSV for core data.
- [ ] Export never requires Pro.

**Evidence**

- Offline/reconnect test script or manual checklist.
- Migration test notes.
- Backup/restore test notes.
- Export file samples.

**Exit rule:** no paid launch until a normal user can trust that their tasks and focus history will
not disappear.

---

### Gate 3: Monetization And Entitlements

**Goal:** a user can start free, trial Pro, pay, receive Pro access, keep Pro access offline, and
downgrade safely.

**Owner:** Engineer A  
**Provider decision:** Paddle is the default choice for subscription-first launch. Lemon Squeezy is
acceptable only if speed outweighs subscription tooling. Both are merchant-of-record options; Paddle
is the safer default for recurring subscriptions.

**Free vs Pro model**

| Feature | Free | Pro monthly/annual | Lifetime |
|---|---|---|---|
| Task management | Full | Full | Full |
| Focus mode and Pomodoro | Full | Full | Full |
| Screen-time tracking | Last 7 days | Unlimited history | Unlimited history |
| Floating Super Focus Pill | Locked | Included | Included |
| AI insights | Locked after trial | Included | Included |
| Advanced reports/trends | Limited | Included | Included |
| Cloud sync | Local only | Included | Included |
| Themes/customization | Limited | Full | Full |

**Pricing recommendation**

- Monthly: `$4/mo`.
- Annual: `$36/yr`.
- Launch lifetime: `$79-$99`, time-limited.
- Trial: 14-day full Pro trial.

**Acceptance checks**

- [ ] Hosted Paddle checkout opens from the desktop app through the system browser.
- [ ] Webhook verifies provider signatures before writing subscription state.
- [ ] Webhook updates subscription tier, status, provider, provider reference, renewal/expiry dates.
- [ ] `effective_tier()` resolves paid, lifetime, tester, trial, and free states correctly.
- [ ] Auth token or local entitlement cache reflects tier after login/restart.
- [ ] A single `useEntitlement(feature)` hook is the UI gating source of truth.
- [ ] Server-side AI endpoint checks user identity, entitlement, and rate limit.
- [ ] Free-tier limits hide or summarize restricted history without deleting user data.
- [ ] Trial starts, expires, and downgrades correctly.
- [ ] Cancelled subscription downgrades after paid period ends, not immediately.
- [ ] Offline paid user keeps last-known access for a defined grace period.
- [ ] "Restore purchase/subscription" works after reinstall.

**Evidence**

- Paddle sandbox checkout test.
- Webhook test logs.
- Entitlement unit tests.
- Offline grace test notes.
- Upgrade/downgrade rehearsal notes.

**Exit rule:** a user can pay and reliably receive what they paid for.

---

### Gate 4: Observability, Support, And Legal Readiness

**Goal:** once users pay, the team can see crashes, diagnose failures, support users, and explain
privacy behavior accurately.

**Owner:** both engineers  
**Risk if skipped:** production failures become invisible and support becomes guesswork.

**Acceptance checks**

- [ ] Sentry Electron or equivalent crash reporting is live.
- [ ] Crash reports include app version, release channel, OS, architecture, and anonymous user ID.
- [ ] Test crash appears in the crash dashboard from a signed build.
- [ ] React route-level error boundaries prevent full app white screens.
- [ ] Error fallback UI gives the user a recovery path.
- [ ] Opt-in product analytics are implemented or intentionally deferred with a written reason.
- [ ] Analytics never collect raw window titles, raw URLs, task content, or private notes unless
      explicitly disclosed and opted in.
- [ ] Support diagnostic export includes app version, OS, sync status, recent non-sensitive logs,
      and DB health summary.
- [ ] Privacy policy covers local tracking, cloud sync, AI summaries, analytics, billing, data
      export, and deletion.
- [ ] Terms and refund policy match the merchant-of-record provider flow.

**Evidence**

- Crash dashboard link or screenshot.
- Error boundary smoke test.
- Analytics event inventory.
- Privacy/terms review notes.
- Diagnostic export sample.

**Exit rule:** no launch until the team can operate the product after it leaves the developer
machine.

---

### Gate 5: Onboarding And Conversion

**Goal:** a new user reaches the first useful loop quickly: task -> focus -> tracked result.

**Owner:** Engineer B  
**Risk if skipped:** users never reach the moment that makes Quoril different.

**Acceptance checks**

- [ ] First-run flow appears only for new users or users without completed onboarding.
- [ ] Flow explains local-first privacy in plain language.
- [ ] Flow explains platform tracking limits honestly.
- [ ] Flow asks for AI/analytics consent where applicable.
- [ ] User can create first task.
- [ ] User can start first focus session.
- [ ] User sees first tracked result/report prompt.
- [ ] Onboarding can be skipped without breaking the app.
- [ ] Upgrade prompts appear only at natural gates: history limit, AI insight, cloud sync, advanced
      report, Super Focus Pill.
- [ ] New user can reach first focus session in under 3 minutes on a clean install.

**Evidence**

- Clean install onboarding recording or notes.
- Time-to-first-focus measurement.
- Upgrade prompt screenshots.

**Exit rule:** no launch until the product demonstrates its core loop before asking for money.

---

### Gate 6: Launch Rehearsal

**Goal:** run a full fake launch before the real one.

**Owner:** both engineers  
**Risk if skipped:** hidden integration failures appear in front of paying users.

**Clean-machine rehearsal**

- [ ] Install signed app.
- [ ] Create account.
- [ ] Complete onboarding.
- [ ] Use the app offline.
- [ ] Restart while offline.
- [ ] Reconnect and sync.
- [ ] Start 14-day trial.
- [ ] Upgrade through Paddle sandbox/live test mode as appropriate.
- [ ] Confirm Pro entitlement after restart.
- [ ] Generate AI insight.
- [ ] Hit free-tier history gate with a separate free account.
- [ ] Receive auto-update from previous signed version.
- [ ] Restart into new version.
- [ ] Cancel subscription.
- [ ] Confirm graceful downgrade behavior.
- [ ] Export data.
- [ ] Restore backup on clean install.
- [ ] Trigger test crash and verify it appears in crash reporting.

**Exit rule:** if rehearsal fails, launch is blocked until the failed path is fixed and rerun.

---

## 5. Readiness Scorecard

Use this weighting for weekly launch readiness. A category is 10 only when its gate-level evidence
exists, not when the team feels confident.

| Area | Weight | Current target for 10/10 |
|---|---:|---|
| Security | 20% | RLS, IPC, secrets, Electron hardening, signing, and notarization verified. |
| Data reliability | 20% | Offline, sync, conflict, backup, restore, export, and migrations tested. |
| Billing | 15% | Checkout, webhook, trial, entitlements, grace, downgrade, and restore purchase work. |
| Release/update | 10% | Signed release, update channel, staged rollout, and rollback path tested. |
| Observability | 10% | Crashes, errors, diagnostics, and privacy-safe analytics live. |
| Onboarding | 10% | New user reaches first focus session in under 3 minutes. |
| Privacy/legal | 10% | Tracking, AI, analytics, sync, billing, export, and deletion disclosures are accurate. |
| Support ops | 5% | Diagnostic export, support runbook, and known issue process exist. |

**10/10 readiness definition**

- No known critical security, payment, release, or data-loss blockers.
- Every paid-user path has been rehearsed.
- Every failure path has a user-safe fallback.
- Production crashes and critical errors are visible to the team.
- The team can ship and roll forward quickly.
- Users can export their data.
- Privacy claims match actual code behavior.

---

## 6. Two-Person Execution Model

**Engineer A: security, Supabase, billing, release**

- RLS and Supabase migrations.
- Secrets and bundle scanning.
- IPC validation.
- Paddle checkout and webhooks.
- Entitlements and server-side gating.
- Code signing, notarization, release CI, update channels.

**Engineer B: reliability, app UX, onboarding, support**

- Offline/sync reliability.
- Backup, restore, export.
- Migration tests.
- Error boundaries and recovery UI.
- Onboarding and upgrade prompts.
- Support diagnostics.

**Shared review required**

- RLS policy changes.
- Sync/conflict logic.
- Entitlement or paywall logic.
- Release/signing changes.
- AI data-sharing changes.
- Anything that can lose user data.

**Weekly operating rhythm**

- Monday: choose the gate that must move.
- Wednesday: run partial evidence checks.
- Friday: update readiness score and blocker list.
- No new feature work enters the sprint unless all launch gates are green or the work is required
  to make a launch gate green.

---

## 7. Sequenced Work Plan

| Order | Work | Owner | Depends on | Exit evidence |
|---:|---|---|---|---|
| 1 | Truth audit and blocker list | Lead | None | Updated inventory, scorecard, blockers. |
| 2 | Supabase migration/RLS test harness | A | 1 | Owner/collaborator/outsider/anonymous tests. |
| 3 | Electron IPC validation and hardening | A | 1 | Payload validation tests and checklist pass. |
| 4 | Signing, notarization, Windows cert, release CI | A | 1 | Signed installable artifacts and logs. |
| 5 | Offline/sync/conflict/tombstone tests | B | 1 | Offline restart and reconnect test results. |
| 6 | Backup, restore, export | B | 5 | Restore proof and sample exports. |
| 7 | Paddle checkout and webhook | A | 2 | Sandbox payment flips tier. |
| 8 | Entitlement hook and gated UI | A/B | 7 | Free/trial/Pro paths verified. |
| 9 | AI endpoint auth, entitlement, rate limit | A | 8 | Unauthorized/free/rate-limit tests. |
| 10 | Crash reporting, error boundaries, diagnostics | B | 3 | Test crash visible, diagnostic export sample. |
| 11 | Onboarding and conversion gates | B | 8 | First focus session under 3 minutes. |
| 12 | Signed auto-update rehearsal | A/B | 4 | Old signed build updates to new signed build. |
| 13 | Full launch rehearsal | A/B | 1-12 | Clean-machine checklist passes. |
| 14 | v1.0-paid launch | A/B | 13 | No red gates. |

---

## 8. Post-Launch Roadmap

Only start after v1.0-paid is stable.

### P2: Differentiation

1. **Focus enforcement and distraction nudges**
   - Gentle session nudge when distracting apps/sites appear.
   - Optional hard mode only after platform-specific reliability and consent are clear.

2. **Calendar integration**
   - Read calendar events for capacity planning.
   - Later: write task time blocks.

3. **Weekly/monthly time report**
   - Exportable, anonymized by default.
   - Useful for retention and organic sharing.

4. **AI Focus Coach v2**
   - Improve suggestions from existing insight pipeline.
   - Keep aggregated metrics only unless users explicitly opt in to more.

5. **Wellbeing and retention**
   - Focus-hours goals.
   - Streaks if they support healthy behavior.
   - Trend-based digital wellbeing score.

### P3: Growth

- Referral loop: free Pro month for successful referrals.
- Public changelog and release notes.
- Cancellation survey and win-back flow.
- Team tier only after solo retention is proven.
- Mobile companion only after desktop business is stable.

---

## 9. Open Decisions

- [ ] Confirm Paddle as provider.
- [ ] Confirm exact lifetime price: recommended `$79-$99`, launch-only.
- [ ] Decide if beta channel ships at v1.0 or immediately after.
- [ ] Choose observability stack: Sentry recommended for crash reporting.
- [ ] Choose product analytics stack: PostHog opt-in/self-host if consistent with privacy story.
- [ ] Decide whether macOS will remain app-level tracking or reintroduce Accessibility-permission
      deeper tracking later.
- [ ] Decide grace period for offline paid entitlement.
- [ ] Decide data retention policy for shared reports and cloud sync.

---

## 10. External Research Basis

Research checked on 2026-07-09:

- Paddle pricing and merchant-of-record/subscription positioning: `https://www.paddle.com/pricing`
- Lemon Squeezy pricing and merchant-of-record positioning: `https://www.lemonsqueezy.com/pricing`
- Lemon Squeezy fee details: `https://docs.lemonsqueezy.com/help/getting-started/fees`
- Lemon Squeezy acquisition by Stripe: `https://www.lemonsqueezy.com/blog/stripe-acquires-lemon-squeezy`
- Electron security checklist: `https://www.electronjs.org/docs/latest/tutorial/security`
- electron-builder auto-update and signing guidance: `https://www.electron.build/auto-update`

---

## 11. Non-Negotiables

- Do not charge users before all launch gates are green.
- Do not ship unsigned production builds.
- Do not expose service-role keys or LLM provider keys to the desktop bundle.
- Do not add new feature breadth until reliability, billing, and signing are complete.
- Do not make privacy claims that are stronger than the code behavior.
- Do not gate export.
- Do not let deleted records resurrect during sync.
- Do not allow a paying user to lose Pro access only because they are offline.
