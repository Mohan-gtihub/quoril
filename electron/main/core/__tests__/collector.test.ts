import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

/* Shared, per-test-controllable mock state. */
const state = vi.hoisted(() => ({
  idle: 0,
  trusted: false,
  activeWinResult: null as any,
  lsFront: "ASN:0x0-0x1:",
  lsName: '"LSDisplayName"="Code"',
  execCalls: [] as string[][],
  // What the user has opted into AND been granted. Both off is the default
  // install state, which must stay entirely permission-free.
  detail: { titles: false, urls: false },
}));

vi.mock("electron", () => ({
  powerMonitor: { getSystemIdleTime: () => state.idle },
  systemPreferences: { isTrustedAccessibilityClient: () => state.trusted },
}));

// trackingDetail reads the SQLite db_meta table; the collector only cares about
// its resolved answer, so stub that rather than standing up a database.
vi.mock("../trackingDetail", () => ({
  resolveDetail: () => state.detail,
}));

vi.mock("active-win", () => ({
  default: vi.fn(async () => state.activeWinResult),
}));

vi.mock("node:child_process", () => {
  const execFile = (cmd: string, args: string[], _opts: any, cb: any) => {
    const callback = typeof _opts === "function" ? _opts : cb;
    state.execCalls.push([cmd, ...args]);
    if (args.includes("front")) callback(null, state.lsFront);
    else callback(null, state.lsName);
  };
  return { execFile, default: { execFile } };
});

import { getActiveWindow, parseLsAppName, categorize } from "../collector";

const origPlatform = process.platform;
function setPlatform(p: NodeJS.Platform) {
  Object.defineProperty(process, "platform", { value: p, configurable: true });
}
afterAll(() => setPlatform(origPlatform));

beforeEach(() => {
  state.idle = 0;
  state.trusted = false;
  state.activeWinResult = null;
  state.lsFront = "ASN:0x0-0x1:";
  state.lsName = '"LSDisplayName"="Code"';
  state.execCalls = [];
  state.detail = { titles: false, urls: false };
  vi.clearAllMocks();
});

/* ── pure helpers ────────────────────────────────────────── */

describe("parseLsAppName", () => {
  it("extracts the display name", () => {
    expect(parseLsAppName('"LSDisplayName"="Google Chrome"')).toBe("Google Chrome");
    expect(parseLsAppName('  "LSDisplayName" = "Code" \n')).toBe("Code");
  });
  it("returns null on missing/garbage output", () => {
    expect(parseLsAppName("")).toBeNull();
    expect(parseLsAppName("ASN:0x0-0x1:")).toBeNull();
    expect(parseLsAppName('"LSDisplayName"=""')).toBeNull();
  });
});

describe("categorize", () => {
  it("maps known apps by name", () => {
    expect(categorize("Code").category).toBe("Development");
    expect(categorize("Slack").category).toBe("Communication");
    expect(categorize("Spotify").category).toBe("Entertainment");
  });
  it("detects a browser site from the title", () => {
    const r = categorize("Google Chrome", "rick astley - YouTube");
    expect(r.category).toBe("Entertainment");
    expect(r.domain).toBe("YouTube");
  });
  it("falls back to title override for generic apps", () => {
    expect(categorize("SomeApp", "Quarterly Budget - Excel").category).toBe("Work");
    expect(categorize("SomeApp", "main.ts - IntelliJ IDEA").category).toBe("Development");
  });
  it("returns Other for unknown app with no title", () => {
    expect(categorize("TotallyUnknownApp").category).toBe("Other");
    expect(categorize("TotallyUnknownApp").domain).toBeUndefined();
  });

  /* A real url beats guessing from the title. The title heuristic only knows
     SITE_PATTERNS; a url covers every site on the web. */
  it("prefers the url over the title when both are present", () => {
    const r = categorize("Google Chrome", "Some Misleading YouTube Title", "https://github.com/a/b");
    expect(r.domain).toBe("GitHub");
    expect(r.category).toBe("Development");
  });

  it("keeps the friendly name and category for a known host", () => {
    const r = categorize("Google Chrome", "", "https://www.youtube.com/feed");
    expect(r.domain).toBe("YouTube");
    expect(r.category).toBe("Entertainment");
  });

  it("records an unknown host by bare hostname, minus www.", () => {
    const r = categorize("Google Chrome", "", "https://www.some-intranet.example.org/x");
    expect(r.domain).toBe("some-intranet.example.org");
    expect(r.category).toBe("Web");
  });

  it("ignores non-web schemes rather than recording them as sites", () => {
    expect(categorize("Google Chrome", "", "about:blank").domain).toBeUndefined();
    expect(categorize("Google Chrome", "", "file:///Users/x/a.html").domain).toBeUndefined();
    expect(categorize("Google Chrome", "", "chrome://settings").domain).toBeUndefined();
  });

  it("falls back to the title when the url is unparseable", () => {
    const r = categorize("Google Chrome", "rick astley - YouTube", "not a url");
    expect(r.domain).toBe("YouTube");
  });
});

/* ── macOS fallback (no Accessibility permission) ─────────── */

describe("getActiveWindow — macOS without permission", () => {
  beforeEach(() => {
    setPlatform("darwin");
    state.trusted = false;
  });

  it("records app-level usage via lsappinfo without calling active-win", async () => {
    state.lsName = '"LSDisplayName"="Code"';
    const r = await getActiveWindow();
    expect(r).toEqual({
      appName: "Code",
      title: "",
      rawApp: "Code",
      isIdle: false,
      category: "Development",
    });
    // active-win must NOT be invoked when untrusted (avoids the TCC prompt).
    const activeWin = (await import("active-win")).default as any;
    expect(activeWin).not.toHaveBeenCalled();
  });

  it("categorizes a browser by name only (no title available)", async () => {
    state.lsName = '"LSDisplayName"="Safari"';
    const r = await getActiveWindow();
    expect(r?.appName).toBe("Safari");
    expect(r?.category).toBe("Web");
    expect(r?.domain).toBeUndefined(); // no title → no site detection
  });

  it("reports Idle when the system is idle", async () => {
    state.idle = 600;
    const r = await getActiveWindow();
    expect(r?.isIdle).toBe(true);
    expect(r?.category).toBe("Idle");
  });

  it("returns null when lsappinfo yields no app", async () => {
    state.lsFront = "";
    expect(await getActiveWindow()).toBeNull();
  });

  it("returns null when the name cannot be parsed", async () => {
    state.lsName = "garbage";
    expect(await getActiveWindow()).toBeNull();
  });
});

/* ── macOS with detail off never calls active-win ────────────
   This is the prompt-avoidance guarantee and the most important property in
   this file. Asking active-win for a title or url is what triggers the macOS
   permission dialog, so with neither capability opted into we must not call it
   at all — not even when the OS happens to trust us already. */

describe("getActiveWindow — macOS never calls active-win when detail is off", () => {
  beforeEach(() => {
    setPlatform("darwin");
    state.trusted = true; // even when trusted, detail is off → lsappinfo only
    state.detail = { titles: false, urls: false };
  });

  it("uses lsappinfo and never invokes active-win", async () => {
    state.lsName = '"LSDisplayName"="Safari"';
    state.activeWinResult = {
      owner: { name: "Google Chrome", path: "/Applications/Chrome.app" },
      title: "rick astley - YouTube",
    };
    const r = await getActiveWindow();
    expect(r?.appName).toBe("Safari");
    expect(r?.title).toBe(""); // no title without active-win
    const activeWin = (await import("active-win")).default as any;
    expect(activeWin).not.toHaveBeenCalled();
  });

  it("returns Idle (with the lsappinfo app) when idle", async () => {
    state.idle = 600;
    state.lsName = '"LSDisplayName"="Code"';
    const r = await getActiveWindow();
    expect(r?.isIdle).toBe(true);
    expect(r?.rawApp).toBe("Code");
  });

  it("returns null when lsappinfo yields no app", async () => {
    state.lsFront = "";
    expect(await getActiveWindow()).toBeNull();
  });
});

/* ── macOS with detail opted into ────────────────────────── */

describe("getActiveWindow — macOS with detail enabled", () => {
  beforeEach(() => {
    setPlatform("darwin");
    state.activeWinResult = {
      owner: { name: "Google Chrome", path: "/Applications/Chrome.app" },
      title: "rick astley - YouTube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    };
  });

  it("asks active-win only for the capabilities that are live", async () => {
    state.detail = { titles: false, urls: true };
    await getActiveWindow();

    const activeWin = (await import("active-win")).default as any;
    // Requesting a title is what prompts for Screen Recording — it must stay off.
    expect(activeWin).toHaveBeenCalledWith({
      screenRecordingPermission: false,
      accessibilityPermission: true,
    });
  });

  it("derives the domain from the real url, not the title", async () => {
    state.detail = { titles: false, urls: true };
    const r = await getActiveWindow();
    expect(r?.domain).toBe("YouTube");
    expect(r?.category).toBe("Entertainment");
  });

  it("uses lsappinfo no more once active-win is driving", async () => {
    state.detail = { titles: true, urls: true };
    await getActiveWindow();
    expect(state.execCalls.length).toBe(0);
  });

  it("passes both options through when both are live", async () => {
    state.detail = { titles: true, urls: true };
    const r = await getActiveWindow();

    const activeWin = (await import("active-win")).default as any;
    expect(activeWin).toHaveBeenCalledWith({
      screenRecordingPermission: true,
      accessibilityPermission: true,
    });
    expect(r?.title).toBe("rick astley - YouTube");
  });

  it("still returns Idle when the system is idle", async () => {
    state.detail = { titles: true, urls: true };
    state.idle = 600;
    const r = await getActiveWindow();
    expect(r?.isIdle).toBe(true);
    expect(r?.category).toBe("Idle");
  });
});

/* ── non-macOS → active-win regardless of trust ──────────── */

describe("getActiveWindow — Windows/Linux", () => {
  it("uses active-win without the permission gate", async () => {
    setPlatform("win32");
    state.trusted = false; // irrelevant off darwin
    state.activeWinResult = {
      owner: { name: "slack.exe", path: "C:/slack.exe" },
      title: "general",
    };
    const r = await getActiveWindow();
    expect(r?.appName).toBe("slack"); // .exe stripped
    expect(r?.category).toBe("Communication");
    expect(state.execCalls.length).toBe(0); // no lsappinfo on Windows
  });
});
