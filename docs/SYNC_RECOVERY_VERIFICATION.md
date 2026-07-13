# Sync Recovery Verification

Run this staged test after changing sync code, SQLite queue behavior, or Supabase task policies. It uses a single temporary user across two independently persisted SQLite journals, then removes that user and all test data.

## Required configuration

Set these values in an untracked environment file or shell:

```sh
SYNC_TEST_SUPABASE_URL=https://your-staging-project.supabase.co
SYNC_TEST_SUPABASE_ANON_KEY=your-publishable-or-anon-key
SYNC_TEST_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SYNC_TEST_ALLOW_LIVE=true
```

Use staging by default. Running against production is permitted only with isolated test identities; the command never selects or modifies any other user’s rows.

## Run

```sh
npm run test:sync-recovery
```

The harness proves the minimum recovery contract with real authenticated Supabase requests:

1. An offline mutation persists through a local SQLite restart.
2. Reconnection drains the queue and restores the row on a second device.
3. Two-device edits converge by latest `updated_at` value.
4. A cloud deletion becomes a tombstone and a stale non-deleted row cannot resurrect it.

Keep the terminal output with the release evidence. This complements, but does not replace, a manual clean-machine rehearsal of the packaged desktop app on macOS and Windows.
