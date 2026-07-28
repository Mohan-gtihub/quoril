"""
Quoril demo tour — an automated, smooth walkthrough of the app for screen
recording (ads / team demos).

HOW IT WORKS
------------
Quoril navigates with a HashRouter, so every section is just a URL hash
(#/dashboard, #/planner, ...). This script drives the tour by two means:

  1. NAVIGATION (robust): it focuses the window and navigates between
     sections. Because routes are hash-based, the spine of the tour does not
     depend on clicking exact pixels.
  2. LIVE MOMENTS (optional, fragile): a few beats — starting the focus
     timer, opening the Insights modal — are real clicks at coordinates you
     calibrate once. If a click drifts, only that beat is affected; the tour
     itself keeps going.

WHY IT CANNOT "just know" the coordinates: this script runs on YOUR screen,
whose resolution, DPI scaling and window size the author never saw. The
one-time calibration below records the real positions on your display.

BEFORE YOU RUN
--------------
  1. Log into the Ericville account (the one with demo data) manually.
     This script never touches your password.
  2. Maximize the Quoril window (custom title-bar maximize, keeps sidebar).
  3. pip install pyautogui pytweening pygetwindow
  4. Start your screen recorder (Win+G -> record), then run this script.

USAGE
  python scripts/demo-tour.py            # run the tour (calibrates first time)
  python scripts/demo-tour.py --calibrate  # re-run calibration only
  python scripts/demo-tour.py --loop       # loop forever (kiosk/ad reel)
  python scripts/demo-tour.py --fast       # shorter pauses for a rehearsal

STOP: slam the mouse into any screen corner (pyautogui failsafe) or Ctrl+C.
"""

import argparse
import json
import os
import sys
import time

try:
    import pyautogui
    import pytweening
except ImportError:
    print("Missing dependencies. Run:  pip install pyautogui pytweening pygetwindow")
    sys.exit(1)

try:
    import pygetwindow as gw
except ImportError:
    gw = None  # window focusing is best-effort; the tour still runs without it

# Corner failsafe: yank the mouse to a corner to abort instantly.
pyautogui.FAILSAFE = True

HERE = os.path.dirname(os.path.abspath(__file__))
CALIB_PATH = os.path.join(HERE, ".demo-tour-calibration.json")

# The tour spine. Each stop is a section to show and how long to hold on it.
# `hold` is seconds to linger so the recording can breathe. `note` prints so
# you can narrate. `live` names an optional calibrated click that makes the
# section move (or None).
TOUR = [
    {"key": "home",       "label": "Home",       "hold": 4.0, "live": None,
     "note": "Overview: activity heatmap, habits, daily rhythm."},
    {"key": "planner",    "label": "Planner",    "hold": 4.5, "live": None,
     "note": "Task board — drag-and-drop kanban with today's work."},
    {"key": "reports",    "label": "Reports",    "hold": 6.0, "live": "insights",
     "note": "The rich one: focus trends, peak hours, donut, goal ring. Opens AI Insights."},
    {"key": "screentime", "label": "Screen Time", "hold": 4.5, "live": None,
     "note": "Per-app / per-domain usage breakdown."},
    {"key": "canvas",     "label": "Canvas",     "hold": 5.0, "live": None,
     "note": "Infinite whiteboard. (Pre-open a board with content first.)"},
    {"key": "focus",      "label": "Focus",      "hold": 6.0, "live": "start_timer",
     "note": "Full-screen focus timer. Starts a session so the ring animates."},
]

# Calibrated click points, filled by calibrate(). Keys referenced by TOUR.live
# and by the section switcher. Coordinates are absolute screen pixels.
CALIB_POINTS = {
    # section nav clicks (fallback if hash nav can't be used)
    "sidebar_home":  "Home in the sidebar",
    "sidebar_planner": "Planner in the sidebar",
    "sidebar_reports": "Reports in the sidebar",
    "sidebar_screentime": "Screen Time in the sidebar",
    "sidebar_canvas": "Canvas in the sidebar",
    # live-moment clicks
    "insights":    "the 'Insights' button on the Reports screen",
    "start_timer": "the Play / start button on the Focus timer",
    "focus_entry": "how you reach Focus mode (e.g. a Focus button)",
}

SIDEBAR_FOR = {
    "home": "sidebar_home",
    "planner": "sidebar_planner",
    "reports": "sidebar_reports",
    "screentime": "sidebar_screentime",
    "canvas": "sidebar_canvas",
}


def load_calibration():
    if os.path.exists(CALIB_PATH):
        with open(CALIB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_calibration(points):
    with open(CALIB_PATH, "w", encoding="utf-8") as f:
        json.dump(points, f, indent=2)
    print(f"\nSaved calibration -> {CALIB_PATH}")


def calibrate():
    """Walk through each point, letting the user place the cursor and confirm."""
    print("=" * 64)
    print("CALIBRATION — for each item, move your mouse over the target in")
    print("Quoril, then press ENTER here. Type 's' + ENTER to skip an item")
    print("you don't have (skipped live-moments just won't fire).")
    print("=" * 64)
    points = load_calibration()
    for name, desc in CALIB_POINTS.items():
        existing = points.get(name)
        suffix = f"  [current: {existing}]" if existing else ""
        ans = input(f"\nHover over {desc}{suffix}\n  ENTER to capture / 's' to skip: ").strip().lower()
        if ans == "s":
            print("  skipped.")
            continue
        x, y = pyautogui.position()
        points[name] = [x, y]
        print(f"  captured ({x}, {y})")
    save_calibration(points)
    return points


def focus_window():
    """Best-effort: bring the Quoril window to the front so keystrokes land."""
    if gw is None:
        return
    for w in gw.getAllTitles():
        if "quoril" in w.lower():
            try:
                win = gw.getWindowsWithTitle(w)[0]
                if not win.isActive:
                    win.activate()
                time.sleep(0.4)
            except Exception:
                pass
            return


def glide(x, y, duration=0.9):
    """Smooth eased mouse move — the thing that separates pro footage from
    robotic teleporting. easeInOutQuad accelerates then settles."""
    pyautogui.moveTo(x, y, duration=duration, tween=pytweening.easeInOutQuad)


def click_point(points, name, move_time=0.9, settle=0.6):
    """Glide to a calibrated point and click. No-op (with a note) if the point
    wasn't calibrated, so a missing live-moment never crashes the tour."""
    p = points.get(name)
    if not p:
        print(f"    (live moment '{name}' not calibrated — skipping)")
        return False
    glide(p[0], p[1], duration=move_time)
    time.sleep(0.2)
    pyautogui.click()
    time.sleep(settle)
    return True


def go_to_section(points, key):
    """Navigate to a section. Prefers a calibrated sidebar click (visible on
    camera — the cursor travels to the nav item, which reads well). Falls back
    to nothing if uncalibrated; the tour still advances via the hold."""
    sidebar = SIDEBAR_FOR.get(key)
    if sidebar and points.get(sidebar):
        click_point(points, sidebar, move_time=1.0, settle=0.8)
    else:
        # 'focus' has no sidebar entry; reach it via its calibrated entry click.
        if key == "focus" and points.get("focus_entry"):
            click_point(points, "focus_entry", move_time=1.0, settle=0.8)


def run_tour(points, fast=False, loop=False):
    scale = 0.5 if fast else 1.0
    print("\nStarting in 3s — switch to Quoril and start recording now.")
    time.sleep(3)

    while True:
        focus_window()
        for stop in TOUR:
            print(f"\n-> {stop['label']}: {stop['note']}")
            go_to_section(points, stop["key"])
            time.sleep(0.6)

            # Fire the live moment (start timer, open insights) if present.
            if stop["live"]:
                time.sleep(0.8)
                click_point(points, stop["live"])

            # Let the section breathe on camera.
            time.sleep(stop["hold"] * scale)

        print("\n-- tour complete --")
        if not loop:
            break
        print("Looping...\n")
        time.sleep(1.5)


def main():
    ap = argparse.ArgumentParser(description="Quoril automated demo tour")
    ap.add_argument("--calibrate", action="store_true", help="re-run calibration only")
    ap.add_argument("--loop", action="store_true", help="loop the tour forever")
    ap.add_argument("--fast", action="store_true", help="shorter pauses (rehearsal)")
    args = ap.parse_args()

    if args.calibrate:
        calibrate()
        return

    points = load_calibration()
    if not points:
        print("No calibration found — running first-time calibration.\n")
        points = calibrate()

    run_tour(points, fast=args.fast, loop=args.loop)


if __name__ == "__main__":
    main()
