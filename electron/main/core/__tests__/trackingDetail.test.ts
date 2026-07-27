import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

const state = vi.hoisted(() => ({
  meta: new Map<string, string>(),
  accessibilityTrusted: false,
  screenStatus: "denied" as string,
  throwOnRead: false,
  /** Every `prompt` argument isTrustedAccessibilityClient was called with. */
  promptArgs: [] as boolean[],
}));

vi.mock("electron", () => ({
  systemPreferences: {
    isTrustedAccessibilityClient: (prompt: boolean) => {
      state.promptArgs.push(prompt);
      if (prompt) state.accessibilityTrusted = true; // simulate the user accepting
      return state.accessibilityTrusted;
    },
    getMediaAccessStatus: () => state.screenStatus,
  },
}));

vi.mock("../../db", () => ({
  dbOps: {
    exec: (sql: string, params: any[] = []) => {
      if (state.throwOnRead) throw new Error("db unavailable");
      if (sql.trim().toUpperCase().startsWith("SELECT")) {
        const value = state.meta.get(params[0]);
        return value === undefined ? [] : [{ value }];
      }
      state.meta.set(params[0], params[1]);
      return null;
    },
  },
}));

import {
  getTrackingDetail,
  setFlag,
  isGranted,
  requestAccessibility,
  resolveDetail,
} from "../trackingDetail";

const origPlatform = process.platform;
function setPlatform(p: NodeJS.Platform) {
  Object.defineProperty(process, "platform", { value: p, configurable: true });
}
afterAll(() => setPlatform(origPlatform));

beforeEach(() => {
  state.meta.clear();
  state.accessibilityTrusted = false;
  state.screenStatus = "denied";
  state.throwOnRead = false;
  state.promptArgs = [];
  setPlatform("darwin");
});

describe("flags", () => {
  it("defaults both capabilities to off", () => {
    const d = getTrackingDetail();
    expect(d.titles.enabled).toBe(false);
    expect(d.urls.enabled).toBe(false);
  });

  it("round-trips an opt-in", () => {
    setFlag("urls", true);
    expect(getTrackingDetail().urls.enabled).toBe(true);
    setFlag("urls", false);
    expect(getTrackingDetail().urls.enabled).toBe(false);
  });

  it("keeps the two capabilities independent", () => {
    setFlag("urls", true);
    expect(getTrackingDetail().titles.enabled).toBe(false);
  });

  // A capability must never switch itself on because storage misbehaved.
  it("fails closed when the database read throws", () => {
    setFlag("urls", true);
    state.throwOnRead = true;
    expect(getTrackingDetail().urls.enabled).toBe(false);
  });
});

describe("isGranted", () => {
  it("maps urls to Accessibility and titles to Screen Recording", () => {
    state.accessibilityTrusted = true;
    state.screenStatus = "denied";
    expect(isGranted("urls")).toBe(true);
    expect(isGranted("titles")).toBe(false);

    state.accessibilityTrusted = false;
    state.screenStatus = "granted";
    expect(isGranted("urls")).toBe(false);
    expect(isGranted("titles")).toBe(true);
  });

  it("reports granted off macOS, which has no such permissions", () => {
    setPlatform("win32");
    expect(isGranted("urls")).toBe(true);
    expect(isGranted("titles")).toBe(true);
  });

  // Status is read on every pulse and at boot, so it must never prompt.
  // requestAccessibility is the only path allowed to pass prompt=true.
  it("checks Accessibility without prompting", () => {
    isGranted("urls");
    getTrackingDetail();
    resolveDetail();
    expect(state.promptArgs.length).toBeGreaterThan(0);
    expect(state.promptArgs.every((p) => p === false)).toBe(true);
    expect(state.accessibilityTrusted).toBe(false);
  });
});

describe("requestAccessibility", () => {
  it("prompts and reflects the grant", () => {
    expect(state.accessibilityTrusted).toBe(false);
    expect(requestAccessibility()).toBe(true);
    expect(isGranted("urls")).toBe(true);
  });
});

describe("resolveDetail", () => {
  it("requires both the opt-in and the OS grant", () => {
    expect(resolveDetail()).toEqual({ titles: false, urls: false });

    setFlag("urls", true);
    // Opted in, not granted → still off.
    expect(resolveDetail().urls).toBe(false);

    state.accessibilityTrusted = true;
    expect(resolveDetail().urls).toBe(true);
  });

  it("degrades silently when a permission is revoked in System Settings", () => {
    setFlag("urls", true);
    state.accessibilityTrusted = true;
    expect(resolveDetail().urls).toBe(true);

    // User revokes it; the stored opt-in is untouched but collection stops.
    state.accessibilityTrusted = false;
    expect(resolveDetail().urls).toBe(false);
    expect(getTrackingDetail().urls.enabled).toBe(true);
  });

  it("is granted-by-default off macOS, so the flag alone decides", () => {
    setPlatform("win32");
    expect(resolveDetail().titles).toBe(false);
    setFlag("titles", true);
    expect(resolveDetail().titles).toBe(true);
  });
});
