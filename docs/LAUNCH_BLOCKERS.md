# Quoril Launch Blockers

**Date:** 2026-07-09  
**Status:** Open  
**Source:** `docs/PRODUCTION_ROADMAP.md`

This file tracks launch blockers only. If an item does not block paid launch, it belongs in a
normal product backlog, not here.

---

## Red Blockers

| ID | Blocker | Owner | Gate | Evidence needed |
|---|---|---|---|---|
| LB-001 | Supabase live schema/RLS is not proven against repo SQL. | A | Gate 1 | Reproducible migration path and owner/collaborator/outsider/anonymous RLS tests. |
| LB-002 | IPC write/sync handlers do not have full main-process payload validation. | A | Gate 1 | Schema validation or explicit guards for every privileged write/sync channel. |
| LB-003 | Production signing is not proven for macOS and Windows. | A | Gate 1/6 | Real Developer ID notarization, real Windows Authenticode signing, CI logs. |
| LB-004 | Billing loop is missing. | A | Gate 3 | Paddle checkout, webhook, subscription update, entitlement refresh. |
| LB-005 | Server-side AI endpoint is not fully production-gated. | A | Gate 3/4 | Auth, entitlement, rate limit, abuse logging, and privacy disclosure. |
| LB-006 | Offline/sync reliability is not proven under restart/reconnect/conflict/deletion. | B | Gate 2 | Test evidence for offline mutations, tombstone priority, conflict behavior. |
| LB-007 | Real local backup, restore, and JSON/CSV export are missing. | B | Gate 2 | Restorable backup and export samples from clean install. |
| LB-008 | Crash reporting is missing from production builds. | B | Gate 4 | Test crash visible in Sentry or equivalent from signed build. |
| LB-009 | First-run onboarding is missing. | B | Gate 5 | New user reaches first focus session in under 3 minutes. |
| LB-010 | Full signed launch rehearsal has not run. | A/B | Gate 6 | Clean-machine rehearsal checklist passes end to end. |

---

## Yellow Risks

| ID | Risk | Owner | Decision needed |
|---|---|---|---|
| LR-001 | macOS tracking depth is app-level unless Accessibility permission is reintroduced. | B | Decide whether this is a product limitation or future native-permission project. |
| LR-002 | macOS entitlements may be broader than necessary. | A | Minimize entitlements before notarized production release. |
| LR-003 | Existing documentation contains older "production ready" claims. | Lead | Decide whether to archive or annotate stale docs before investor/customer use. |
| LR-004 | Public shared reports need retention/deletion/privacy rules. | A/B | Define retention and user deletion behavior. |
| LR-005 | Product analytics vendor is undecided. | B | Choose PostHog/self-host/none-before-launch. |

---

## Closed Blockers

None yet.

---

## Update Rules

- Add a blocker only if it prevents charging money safely.
- Close a blocker only with evidence, not confidence.
- Link closed blockers to PRs, test output, release logs, or rehearsal notes.
- Re-score `docs/PRODUCTION_READINESS_SCORECARD.md` after any red blocker closes.
