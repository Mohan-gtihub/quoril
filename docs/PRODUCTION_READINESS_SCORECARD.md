# Quoril Production Readiness Scorecard

**Date:** 2026-07-09  
**Status:** Initial baseline  
**Source:** `docs/PRODUCTION_ROADMAP.md`

This scorecard is the weekly operating view for launch readiness. Scores are evidence-based:
a category reaches 10 only when the linked launch-gate checks pass.

---

## Current Score

| Area | Weight | Current | Weighted | Target for 10/10 |
|---|---:|---:|---:|---|
| Security | 20% | 5/10 | 1.00 | RLS, IPC, secrets, Electron hardening, signing, and notarization verified. |
| Data reliability | 20% | 5/10 | 1.00 | Offline, sync, conflict, backup, restore, export, and migrations tested. |
| Billing | 15% | 2/10 | 0.30 | Checkout, webhook, trial, entitlements, grace, downgrade, and restore purchase work. |
| Release/update | 10% | 6/10 | 0.60 | Signed release, update channel, staged rollout, and rollback path tested. |
| Observability | 10% | 2/10 | 0.20 | Crashes, errors, diagnostics, and privacy-safe analytics live. |
| Onboarding | 10% | 2/10 | 0.20 | New user reaches first focus session in under 3 minutes. |
| Privacy/legal | 10% | 4/10 | 0.40 | Tracking, AI, analytics, sync, billing, export, and deletion disclosures are accurate. |
| Support ops | 5% | 2/10 | 0.10 | Diagnostic export, support runbook, and known issue process exist. |

**Weighted readiness:** 3.8/10  
**Lead engineer adjusted readiness:** 5.5/10

The weighted score is intentionally strict because missing billing and observability heavily limit
launch readiness. The adjusted score recognizes that the product feature surface is already strong.

---

## Weekly Update Template

| Week | Security | Data | Billing | Release | Observability | Onboarding | Privacy/legal | Support | Overall | Notes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 2026-07-09 | 5 | 5 | 2 | 6 | 2 | 2 | 4 | 2 | 3.8 | Initial baseline after roadmap rewrite. |

---

## Scoring Rules

- **0-2:** missing or only conceptual.
- **3-4:** partially implemented, not proven.
- **5-6:** implemented but lacks automated tests, release proof, or failure-path coverage.
- **7-8:** mostly production-ready, with one or two known gaps.
- **9:** launchable with minor non-blocking gaps.
- **10:** gate evidence exists and launch rehearsal passes.

---

## Next Score-Improving Moves

1. Build the RLS test harness and compare live Supabase policies to repo SQL.
2. Add IPC payload validation for write/sync handlers.
3. Choose Paddle and implement checkout/webhook in sandbox.
4. Add crash reporting from a signed build.
5. Write and run offline restart plus reconnect sync tests.
6. Build real backup/restore/export.
7. Run the first clean-machine signed auto-update rehearsal.
