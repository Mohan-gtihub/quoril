# Quoril Mobile — Visual Flows & Screen Design

> Render the mermaid blocks at https://mermaid.live or in any Markdown viewer that supports mermaid (GitHub, Obsidian, VS Code + Mermaid ext).
> ASCII wireframes show the actual screen layouts. This document is the *thinking made visible*.

---

## 0. The Product Thesis (what makes Quoril different)

Most "screen time" apps are **passive rear-view mirrors** — they show you a report at the end of the day, after the damage is done. Quoril is an **active co-pilot**: it notices the moment you drift into Instagram reels and *intervenes in real time* — a Dynamic Island nudge, a gentle friction, a reminder of what you were supposed to be doing.

> **One line:** *Quoril doesn't just tell you that you wasted 2 hours. It taps you on the shoulder at minute 3 and asks: "Is this what you wanted to be doing right now?"*

The three pillars:

```mermaid
flowchart LR
    A["👁️ AWARENESS<br/>See where time really goes<br/>(honest, real-time)"]
    B["✋ INTERVENTION<br/>Interrupt distraction<br/>the moment it starts"]
    C["📈 GROWTH<br/>Build focus as a habit<br/>streaks, scores, wins"]
    A --> B --> C --> A
    style A fill:#0A84FF,color:#fff
    style B fill:#FF9F0A,color:#fff
    style C fill:#30D158,color:#fff
```

---

## 1. App Map (navigation architecture)

```mermaid
flowchart TD
    Launch([App Launch]) --> Auth{Signed in?}
    Auth -- No --> Onboard[Onboarding + Permissions]
    Onboard --> Login[Sign in / Google OAuth]
    Login --> Home
    Auth -- Yes --> Home

    Home[["🏠 Root — Glass Tab Bar"]]
    Home --> Focus["◉ FOCUS<br/>timer + sessions"]
    Home --> Tasks["☑ TASKS<br/>capture + manage"]
    Home --> Insights["▤ INSIGHTS<br/>reports + screen time"]
    Home --> You["⚙ YOU<br/>profile + settings"]

    Focus --> FSession[Active Session]
    FSession --> FLive[Live Activity / Dynamic Island]

    Tasks --> TDetail[Task Sheet]
    Tasks --> TAdd[Quick Add Sheet]

    Insights --> IReports[Reports]
    Insights --> IScreen[Screen Time]
    IScreen --> IIntervene[Intervention History]

    You --> SFocus[Focus & Pomodoro]
    You --> SBlock[Distraction Rules ⭐]
    You --> SNotif[Notifications]
    You --> SAccount[Account / Plan]

    style Home fill:#1C1C1E,color:#fff
    style SBlock fill:#FF9F0A,color:#fff
```

⭐ **Distraction Rules** is the settings screen unique to Quoril — where the intervention engine is configured.

---

## 2. Onboarding Flow (sets up the intervention engine)

Onboarding isn't a tour — it's *permission + intent capture*. We ask the user what they're trying to escape.

```mermaid
flowchart TD
    O1["Welcome<br/>'Your focus companion'"] --> O2
    O2["What steals your time?<br/>▢ Instagram ▢ TikTok<br/>▢ YouTube ▢ X ▢ Reddit"] --> O3
    O3["What's your daily focus goal?<br/>◔ 2h  ◑ 4h  ◕ 6h"] --> O4
    O4["How hard should we nudge?<br/>Gentle · Firm · Tough-love"] --> O5
    O5["Grant Screen Time access<br/>(so we can see & intervene)"] --> O6
    O6["Allow Notifications<br/>(for real-time nudges)"] --> O7
    O7["Sign in / Create account"] --> Done([→ Focus tab])

    style O2 fill:#FF9F0A,color:#fff
    style O5 fill:#0A84FF,color:#fff
```

**Wireframe — the "what steals your time?" step:**

```
┌───────────────────────────────┐
│                               │
│   What pulls you away?        │  ← Large Title, SF Pro Bold
│   Pick the apps that steal    │  ← secondaryLabel
│   your focus.                 │
│                               │
│   ┌───────────┐ ┌───────────┐ │
│   │ ◉ Instagram│ │ ○ TikTok  │ │  ← glass toggle chips
│   └───────────┘ └───────────┘ │
│   ┌───────────┐ ┌───────────┐ │
│   │ ◉ YouTube │ │ ○ X       │ │
│   └───────────┘ └───────────┘ │
│   ┌───────────┐ ┌───────────┐ │
│   │ ○ Reddit  │ │ ＋ Add     │ │
│   └───────────┘ └───────────┘ │
│                               │
│   ╭───────────────────────╮   │
│   │       Continue        │   │  ← capsule primary btn
│   ╰───────────────────────╯   │
└───────────────────────────────┘
```

---

## 3. ⭐ THE CORE LOOP — Distraction Interception

This is the app. Everything else supports this. A background monitor watches app usage; when a "distraction" app crosses a threshold, Quoril escalates through friction levels.

```mermaid
flowchart TD
    Start([Background monitor active]) --> Detect{Distraction app<br/>opened?}
    Detect -- No --> Start
    Detect -- Yes --> T1[Start soft timer]

    T1 --> Grace{Under grace<br/>period? e.g. 2m}
    Grace -- Yes --> Watch[Keep watching silently]
    Watch --> Grace
    Grace -- No --> L1

    L1["🟡 LEVEL 1 · Dynamic Island nudge<br/>'3m on Instagram — heads up'"] --> R1{Left the app?}
    R1 -- Yes --> Win[✅ Log a 'save' + streak +1]
    R1 -- No --> L2

    L2["🟠 LEVEL 2 · Full alert + haptic<br/>'You planned to focus on «Design».<br/>Still 22m left in your session.'"] --> R2{Left the app?}
    R2 -- Yes --> Win
    R2 -- No --> L3

    L3["🔴 LEVEL 3 · Friction screen<br/>'You've spent 12m here today.<br/>Weekly avg: 47m. Continue?'<br/>[ Take a breath ] [ 5 more min ]"] --> R3{Choice}
    R3 -- Take a breath --> Win
    R3 -- 5 more min --> Grant[Grant limited time, re-arm]
    Grant --> L1

    Win --> Log[(Log to Supabase:<br/>intervention + outcome)]
    Log --> Start

    style L1 fill:#FFD60A,color:#000
    style L2 fill:#FF9F0A,color:#fff
    style L3 fill:#FF453A,color:#fff
    style Win fill:#30D158,color:#fff
```

**Key design principle — escalating friction, never a hard block.** We *inform and nudge*, we don't lock the phone (that breeds resentment and uninstalls). The user always keeps agency; Quoril just makes the distracted choice a *conscious* one.

---

## 4. Dynamic Island / Live Activity — the intervention surface

The Dynamic Island is where Quoril lives while you work. Three jobs: show the focus session, celebrate saves, and deliver nudges.

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> FocusRunning: start session
    FocusRunning --> Nudge: distraction detected
    Nudge --> FocusRunning: returned to focus (save +1)
    Nudge --> Friction: ignored, escalated
    Friction --> FocusRunning: took a breath
    FocusRunning --> Break: pomodoro break
    Break --> FocusRunning: break over
    FocusRunning --> Complete: session done
    Complete --> Idle
```

**Dynamic Island states (ASCII):**

```
COMPACT (focus running)          EXPANDED (tap)
   ●  24:59  🎯                  ┌─────────────────────────┐
                                 │ 🎯 Deep Work · Design    │
                                 │      24:59               │
NUDGE (distraction)              │  ▓▓▓▓▓▓▓░░░  62%          │
   ⚠️  Instagram 3m              │ [ Pause ]     [ Done ]   │
                                 └─────────────────────────┘

FRICTION (escalated)             SAVE (returned to focus)
   🔴 12m today — enough?         ✅ Nice save · 🔥 5 streak
```

---

## 5. Focus Session Flow

```mermaid
flowchart TD
    Idle["Focus tab · Idle<br/>Big 'Start Focus'"] --> Pick[Pick type + task]
    Pick --> Run["Timer running<br/>+ Live Activity spawned<br/>+ Distraction monitor armed"]
    Run --> Event{Event}
    Event -- Pause --> Paused
    Paused -- Resume --> Run
    Event -- Distraction --> Loop["→ Core Loop §3"]
    Loop --> Run
    Event -- Pomodoro end --> BreakUI["Break screen<br/>haptic + gentle sound"]
    BreakUI --> Run
    Event -- Complete --> Celebrate["🎉 Session summary<br/>focus time · saves · score"]
    Celebrate --> Sync[(Write to Supabase)]
    Sync --> Idle
    style Run fill:#0A84FF,color:#fff
    style Celebrate fill:#30D158,color:#fff
```

**Wireframe — Focus running (hero screen):**

```
┌───────────────────────────────┐
│  Focus                    ⋯   │
│                               │
│         ╭───────────╮         │
│        ╱   24:59     ╲        │  ← ring: systemBlue, monospaced numerals
│       │  Deep Work   │        │
│        ╲  ▓▓▓▓░ 62%  ╱        │
│         ╰───────────╯         │
│                               │
│     🎯  Designing the app     │  ← current task chip
│                               │
│   🛡  Protected · 2 saves     │  ← today's distraction-blocks count
│                               │
│   ╭─────────╮   ╭─────────╮   │
│   │  Pause  │   │  Done   │   │  ← glass controls
│   ╰─────────╯   ╰─────────╯   │
└───────────────────────────────┘
```

---

## 6. Insights — turning data into a verdict

Reports don't just show numbers; they deliver a **verdict** and a **next action**. The Screen Time tab foregrounds distractions and the *cost* of them.

**Wireframe — Insights · Screen Time (distraction-forward):**

```
┌───────────────────────────────┐
│  Insights                     │
│  [ Reports | Screen Time ]    │
│                               │
│  ┌───────────────────────────┐│
│  │ Today you lost            ││  ← the headline verdict
│  │   1h 47m to distractions  ││  ← systemRed number, big
│  │   ↓ 22m better than avg   ││  ← green delta = encouragement
│  └───────────────────────────┘│
│                               │
│  Where it went                │
│  ▸ Instagram      54m  ▓▓▓▓▓  │  ← per-app bars, red-tinted
│  ▸ YouTube        38m  ▓▓▓    │
│  ▸ TikTok         15m  ▓      │
│                               │
│  🛡 Quoril saved you          │
│     31m today · 🔥 6-day      │  ← the "win" framing
│     streak                    │
│                               │
│  ┌───────────────────────────┐│
│  │ That 1h47m ≈ finishing    ││  ← relatable cost translation
│  │ 4 focus tasks. Reclaim it?││
│  │        [ Set a limit → ]  ││
│  └───────────────────────────┘│
└───────────────────────────────┘
```

```mermaid
flowchart LR
    Data[(Raw usage +<br/>focus sessions)] --> Agg[Aggregate]
    Agg --> Verdict["Verdict<br/>'lost 1h47m'"]
    Agg --> Win["Win<br/>'saved 31m'"]
    Agg --> Cost["Cost translation<br/>'= 4 tasks'"]
    Verdict --> Action["→ Set a limit"]
    Win --> Action2["→ Keep streak"]
    style Verdict fill:#FF453A,color:#fff
    style Win fill:#30D158,color:#fff
```

---

## 7. Distraction Rules (the config screen — Quoril's signature)

```
┌───────────────────────────────┐
│  ‹ Distraction Rules          │
│                               │
│  WATCHED APPS                 │
│  ┌───────────────────────────┐│
│  │ Instagram          ▸ 2m   ││  ← grace period per app
│  │ TikTok             ▸ 1m   ││
│  │ YouTube            ▸ 5m   ││
│  │ ＋ Add app                ││
│  └───────────────────────────┘│
│                               │
│  NUDGE INTENSITY              │
│  ┌───────────────────────────┐│
│  │ ○ Gentle                  ││
│  │ ◉ Firm                    ││  ← segmented / radio
│  │ ○ Tough-love              ││
│  └───────────────────────────┘│
│                               │
│  SCHEDULE                     │
│  ┌───────────────────────────┐│
│  │ Focus hours   9:00–18:00  ││  ← only intervene when working
│  │ Days          Mon–Fri     ││
│  └───────────────────────────┘│
└───────────────────────────────┘
```

---

## 8. End-to-End User Journey (a day with Quoril)

```mermaid
journey
    title A Productive Day with Quoril
    section Morning
      Open app, see plan: 4: User
      Start Deep Work session: 5: User
    section Mid-session
      Drift to Instagram: 2: User
      Island nudge at 3m: 3: Quoril
      Return to focus, +1 save: 5: User
    section Afternoon
      Pomodoro breaks, streak grows: 4: User
      Ignore a nudge, hit friction screen: 3: Quoril
      Choose 'take a breath': 4: User
    section Evening
      Review Insights verdict: 5: User
      See '31m saved, 6-day streak': 5: User
```

---

## 9. Data Model Additions (for the intervention engine)

The existing Supabase schema covers tasks/focus/apps. Interventions need a little more:

```mermaid
erDiagram
    USER ||--o{ WATCHED_APP : configures
    USER ||--o{ INTERVENTION : receives
    FOCUS_SESSION ||--o{ INTERVENTION : during
    WATCHED_APP {
        uuid id
        string app_bundle_id
        int grace_seconds
        string intensity
    }
    INTERVENTION {
        uuid id
        uuid session_id
        string app
        int level
        string outcome
        timestamp created_at
    }
```

- `outcome` ∈ {returned, snoozed, ignored} → powers the "saves" streak and the Insights win-framing.
- Everything stays offline-first → Drift → Supabase, same sync loop as desktop.

---

## 10. Why this feels professional (design principles recap)

1. **Real-time > retrospective.** The intervention loop (§3) is the moat. No competitor nudges *in the moment* with this restraint.
2. **Nudge, never jail.** Escalating friction preserves user agency → trust → retention.
3. **Frame wins, not shame.** "Saved 31m · 6-day streak" beats "you wasted 2h." Guilt drives uninstalls; progress drives habit.
4. **Apple-native surface.** Dynamic Island + Live Activities make the intervention feel like a *system feature*, not a nagging third-party app.
5. **Cost translation.** "1h47m = 4 tasks" turns abstract minutes into felt loss — the behavioral hook.
```
