# Blitzit UI reference (from the user's screenshots) → Quoril adaptation

## What Blitzit actually looks like
- **Canvas:** true black (#000). Cards: elevated dark-gray (~#1A1B1E) rounded ~16pt, NO borders, minimal depth (layering, not drop shadows).
- **Top bar:** list/workspace selector = stacked colored square app-badges (`W` `P` `+3`) + name ("All list") + chevron. Circular avatar top-right.
- **Bucket tabs:** text tabs `Backlog · This week · Today · Done`. Active = filled dark pill. (Not a sliding segmented control — custom pill tabs.)
- **Progress:** thin accent bar + "2/6 DONE" right-aligned.
- **Task card:** circular check (outline→filled) · title (fire emoji prefix allowed) · `‹ ›` move-bucket arrows · colored square **list badge** (letter) far right · footer `01:30` est (left) + `01:30` done (right). Optional inline sub-row: small ring + "1/3 Subtasks" + chevron; optional "▤ note" indicator.
- **Section labels:** "5 Scheduled tasks today" grey between groups.
- **Add:** floating circular **+ FAB** (Blitzit uses green gradient). Edit = bottom sheet: Title + Est time fields, list picker row, Notes rich editor, ADD SUBTASK / ADD NOTES pills.
- **Accent:** Blitzit = mint/teal-green. **Quoril = systemBlue** (adaptive light/dark).

## Quoril adaptation (native iOS, never web)
- Adaptive: true-black-ish in dark (systemBackground), grouped light in light mode.
- Tabs: **Home (Blitzit board: workspace selector + bucket tabs + task cards + progress + FAB + Start Focus) · Insights · You** (3 tabs, minimal).
- Tapping workspace selector → picker sheet / workspace detail.
- Start Focus (Blitz) → fullscreen Focus mode (timer + distraction interception).
- Every control native Cupertino: draggable sheets w/ detents, CupertinoContextMenu long-press, CupertinoPicker wheels for time, swipe actions, haptics, bouncing scroll.
- Swap Blitzit green → systemBlue everywhere; keep colored list badges (per-workspace color).
