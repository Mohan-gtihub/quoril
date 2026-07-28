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
  recordObservation,
  clearObservations,
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
  clearObservations();
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

/* resolveDetail is what the collector asks active-win for: the opt-in, narrowed
   only by what is worth asking.

   Gating the request on systemPreferences alone made the failure
   self-fulfilling: a false reading meant active-win was never called, so the
   permission was never exercised, so nothing could ever change the reading.
   That shipped, and left users staring at "waiting on permission" they had
   already granted.

   Asking unconditionally is not free either. active-win's helper prompts when
   it is asked for a url without an effective grant, and the tracking loop
   pulses every 5s — so "ask anyway, forever" is a system modal every 5 seconds.
   Hence a bounded probe, then silence. */
describe("resolveDetail", () => {
  it("follows the opt-in, so the capability is actually exercised", () => {
    expect(resolveDetail()).toEqual({ titles: false, urls: false });

    setFlag("urls", true);
    // Not granted according to systemPreferences — we probe anyway.
    expect(state.accessibilityTrusted).toBe(false);
    expect(resolveDetail().urls).toBe(true);
  });

  it("stops asking once urls repeatedly come back empty", () => {
    setFlag("urls", true);
    // Even with the OS claiming the grant is in place: that is exactly the
    // case that loops, because the TCC record can be toggled on and still not
    // match the running binary's signature.
    state.accessibilityTrusted = true;
    expect(resolveDetail().urls).toBe(true);

    // One failure is not enough — a blank tab or a browser mid-launch must not
    // switch the feature off.
    recordObservation("urls", false);
    expect(resolveDetail().urls).toBe(true);
    recordObservation("urls", false);
    expect(resolveDetail().urls).toBe(true);
    recordObservation("urls", false);
    expect(resolveDetail().urls).toBe(false);
  });

  it("forgives a failure streak that a success interrupts", () => {
    setFlag("urls", true);
    state.accessibilityTrusted = true;

    recordObservation("urls", false);
    recordObservation("urls", false);
    recordObservation("urls", true); // streak broken
    recordObservation("urls", false);
    recordObservation("urls", false);
    expect(resolveDetail().urls).toBe(true);
  });

  /* An empty title is what active-win returns BOTH when Screen Recording is
     denied and when the frontmost app simply has no window — verified against
     the real helper. The two cannot be told apart, so titles must never be
     switched off by observation, or looking at the desktop would disable a
     feature the user turned on. */
  it("never suppresses titles, however often they come back empty", () => {
    setFlag("titles", true);
    state.screenStatus = "denied";

    for (let i = 0; i < 10; i++) recordObservation("titles", false);
    expect(resolveDetail().titles).toBe(true);
  });

  it("gives up after a bounded number of probes when nothing is granted", () => {
    setFlag("urls", true);
    state.accessibilityTrusted = false;

    const asked = [resolveDetail().urls, resolveDetail().urls, resolveDetail().urls];
    // A couple of probes to discover the truth, then it stops on its own —
    // without ever having seen a single observation.
    expect(asked).toEqual([true, true, false]);
  });

  it("resumes probing when the user explicitly asks again", () => {
    setFlag("urls", true);
    for (let i = 0; i < 3; i++) recordObservation("urls", false);
    expect(resolveDetail().urls).toBe(false);

    clearObservations();
    expect(resolveDetail().urls).toBe(true);
  });

  it("keeps asking once the capability is observed working", () => {
    setFlag("urls", true);
    recordObservation("urls", true);
    expect(resolveDetail().urls).toBe(true);
    expect(resolveDetail().urls).toBe(true);
  });

  it("asks for nothing that was not opted into", () => {
    state.accessibilityTrusted = true;
    state.screenStatus = "granted";
    expect(resolveDetail()).toEqual({ titles: false, urls: false });
  });

  it("keeps the two capabilities independent", () => {
    setFlag("titles", true);
    expect(resolveDetail()).toEqual({ titles: true, urls: false });
  });

  it("behaves the same off macOS", () => {
    setPlatform("win32");
    expect(resolveDetail().titles).toBe(false);
    setFlag("titles", true);
    expect(resolveDetail().titles).toBe(true);
  });
});

/* What the UI reports as "granted". An observation from the collector beats
   systemPreferences, because systemPreferences describes THIS process while the
   permission is actually exercised by active-win's separate helper binary, and
   the two have been observed disagreeing on a real machine. */
describe("observed capability", () => {
  beforeEach(() => clearObservations());

  it("falls back to the permission API before any evidence exists", () => {
    state.accessibilityTrusted = true;
    expect(getTrackingDetail().urls.granted).toBe(true);

    state.accessibilityTrusted = false;
    expect(getTrackingDetail().urls.granted).toBe(false);
  });

  it("lets a successful observation override a false permission reading", () => {
    state.accessibilityTrusted = false;
    expect(getTrackingDetail().urls.granted).toBe(false);

    recordObservation("urls", true);
    expect(getTrackingDetail().urls.granted).toBe(true);
  });

  it("lets a failed observation override a true permission reading", () => {
    state.accessibilityTrusted = true;
    recordObservation("urls", false);
    expect(getTrackingDetail().urls.granted).toBe(false);
  });

  it("keeps observations per capability", () => {
    state.accessibilityTrusted = false;
    state.screenStatus = "denied";
    recordObservation("titles", true);
    expect(getTrackingDetail().titles.granted).toBe(true);
    expect(getTrackingDetail().urls.granted).toBe(false);
  });

  it("clears back to the permission API, so stale evidence cannot linger", () => {
    recordObservation("urls", true);
    state.accessibilityTrusted = false;
    expect(getTrackingDetail().urls.granted).toBe(true);

    clearObservations();
    expect(getTrackingDetail().urls.granted).toBe(false);
  });
});
