import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

/* Shared, per-test-controllable mock state. */
const state = vi.hoisted(() => ({
  idle: 0,
  trusted: false,
  activeWinResult: null as any,
  lsFront: "ASN:0x0-0x1:",
  lsName: '"LSDisplayName"="Code"',
  execCalls: [] as string[][],
}));

vi.mock("electron", () => ({
  powerMonitor: { getSystemIdleTime: () => state.idle },
  systemPreferences: { isTrustedAccessibilityClient: () => state.trusted },
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

/* ── macOS always uses lsappinfo, never active-win ───────────
   active-win is never called on darwin — its native helper triggers the
   Accessibility prompt, which can't persist on unsigned builds. App tracking
   stays permission-free via lsappinfo even when Accessibility is "granted". */

describe("getActiveWindow — macOS never calls active-win", () => {
  beforeEach(() => {
    setPlatform("darwin");
    state.trusted = true; // even when trusted, we still use lsappinfo
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
