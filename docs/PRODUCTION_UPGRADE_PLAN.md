# 🚀 Project "DeepFlow": Production-Level Upgrade Plan

## Executive Summary
This document outlines the transformation of the current task management prototype into **DeepFlow**, a professional, high-retention focus application. We are moving from a "feature list" approach to a "psychology-first" architecture designed to inducing and sustaining flow states.

---

## 1. Core User Flow (The Engagement Engine)

### Concept
The lifecycle of a task is not just "ToDo -> Done". It is a commitment funnel.
`Idea -> Commitment -> Planning -> Execution -> Reflection`

### User Journey
1.  **Capture**: User dumps idea into Backlog (Low friction).
2.  **Commit**: User moves task to "This Week" (Medium friction, requires rough estimation).
3.  **Schedule**: User moves task to "Today" (High friction, requires timeboxing).
4.  **Execute**: User enters "Focus Mode" (Immersion).
    *   *System Check*: Is it safe? (Capacity check).
5.  **Complete**: Dopamine hit, reflection prompt.

### Logic Rules & Capacity Limits
-   **Today's Limit**: Total `estimated_minutes` in "Today" column cannot exceed `Daily Capacity` (default 6h) without a stern warning ("Burnout Risk").
-   **One Active Task**: System enforces strict "Single Tasking". You cannot start Task B while Task A is active.

---

## 2. Focus Mode (Immersion System)

### Upgrade Specifications
-   **Visuals**: Transition from "App View" to "Zen Mode". All navigation bars, sidebars, and clutter fade away.
-   **Emergency Exit**: Long-press (3s) to exit focus session early. Prevents impulsive switching.
-   **Ambient State**:
    -   *Warm-up (0-2m)*: Breathing guide.
    -   *Flow (2m+)*: Minimalist timer, subtle pulsing border.
    -   *Fatigue (after 25m/50m)*: Gentle pulse indicating break recommendation.

---

## 3. Task System Architecture

### Schema Enhancements
We need to upgrade the `Task` model to support sophisticated scheduling.

```typescript
type TaskPriority = 'P1_CRITICAL' | 'P2_CORE' | 'P3_DELEGATE' | 'P4_SOMEDAY'

interface TaskUpgrade {
    // Capacity Planning
    complexity_score: 1 | 2 | 3 | 5 | 8; // Story points
    energy_level_required: 'high' | 'medium' | 'low';
    
    // Constraints
    due_date_hard: Date; // Deadline
    due_date_soft: Date; // Target
    
    // Dependencies
    blocked_by: string[]; // Task IDs
    blocks: string[];     // Task IDs
    
    // Recurrence
    recurrence: {
        pattern: 'daily' | 'weekly' | 'custom';
        interval: number;
        days_of_week?: number[];
        end_date?: Date;
    }
}
```

---

## 4. Productivity Feedback Loop

### The "Dopamine Loop"
1.  **Trigger**: "Start day" notification or clear "Next Task" suggestion.
2.  **Action**: 25m Focus Session.
3.  **Reward**: 
    -   Immediate: "Confetti" + Sound.
    -   Cumulative: XP Gain per minute focused.
    -   Visual: "Streak Flame" grows brighter.
4.  **Reflection**: "How was your energy?" (1-5 scale) logged after task.

---

## 5. Motivation & Analytics Features to Build

1.  **Heatmap**: GitHub-style contribution graph but for "Focus Minutes".
2.  **Consistency Score**: `(Days Focused / Last 30 Days) * 100`.
3.  **Integrity Score**: `(Actual Time / Estimated Time)`. Closer to 1.0 is better. Penalize underestimation.

---

## Next Implementation Steps

### Phase 1: Capacity & Reality Check (IMMEDIATE)
-   Implement `Daily Capacity` setting in Profile.
-   Upgrade `TodayColumn` to visualize "Load vs Capacity".
-   Add "Overload Warning" visual state if `Target > Capacity`.

### Phase 2: Flow Architecture
-   Refactor `FocusMode` to support "Emergency Exit" and "Ambient States".
-   Implement `TaskDependency` logic.

### Phase 3: Gamification
-   Add XP system and Leveling backend.
