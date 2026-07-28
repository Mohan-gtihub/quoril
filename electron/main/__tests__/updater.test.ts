import { describe, it, expect, vi } from "vitest";
import { createRequire } from "node:module";

/* updater.ts pulls in electron at import time; none of it is needed to test the
   error classification, which is pure. */
vi.mock("electron", () => ({
  app: { isPackaged: false, getPath: () => "/tmp", on: () => {} },
  ipcMain: { handle: () => {} },
  BrowserWindow: { getAllWindows: () => [] },
}));

vi.mock("electron-updater", () => ({
  default: { autoUpdater: { on: () => {}, checkForUpdates: async () => {} } },
}));

import { isFeedMissingError, isNetworkError, describeError } from "../updater";

/* The real error electron-updater raises, built by the same factory that runs in
   production, rather than a hand-written approximation of it. This is what a
   release with no build for the current platform actually produces. */
const require_ = createRequire(import.meta.url);
const { createHttpError } = require_(
  "electron-updater/node_modules/builder-util-runtime/out/httpExecutor.js",
);

const realGithub404 = () =>
  createHttpError(
    { statusCode: 404, statusMessage: "Not Found" },
    {
      server: "github.com",
      "content-type": "text/html; charset=utf-8",
      "strict-transport-security": "max-age=31536000; includeSubdomains; preload",
      vary: "X-PJAX, X-PJAX-Container, Turbo-Visit, Turbo-Frame, X-Requested-With",
      "x-github-request-id": "E63C:A1F82:25882A9:2A61E9F:6A682037",
    },
  );

describe("isFeedMissingError", () => {
  it("recognises the real 404 electron-updater raises for a missing feed", () => {
    expect(isFeedMissingError(realGithub404())).toBe(true);
  });

  it("recognises a 404 by status code alone", () => {
    expect(isFeedMissingError({ statusCode: 404 })).toBe(true);
  });

  it("recognises the stringified forms that reach us without a status code", () => {
    expect(isFeedMissingError(new Error("HttpError: 404 Not Found"))).toBe(true);
    expect(isFeedMissingError(new Error("Cannot find latest-mac.yml"))).toBe(true);
  });

  it("does not swallow errors the user genuinely needs to see", () => {
    expect(isFeedMissingError(new Error("ENOSPC: no space left on device"))).toBe(false);
    expect(isFeedMissingError({ statusCode: 500 })).toBe(false);
    expect(isFeedMissingError({ statusCode: 403 })).toBe(false);
    // A signature failure is the one error that must never be quietly reported
    // as "you are up to date".
    expect(
      isFeedMissingError(new Error("New version is not signed by the application owner")),
    ).toBe(false);
  });

  it("does not treat a 404 inside unrelated prose as a missing feed", () => {
    expect(isFeedMissingError(new Error("downloaded 404 bytes"))).toBe(false);
  });
});

describe("describeError", () => {
  it("keeps only the first line of the response dump", () => {
    // The whole reason this exists: the raw message is the status line followed
    // by every response header, which is what users saw in the update card.
    const raw = realGithub404().message;
    expect(raw).toContain("server");
    expect(describeError(realGithub404())).toBe("404 Not Found");
  });

  it("caps a single enormous line", () => {
    const out = describeError(new Error("x".repeat(5000)));
    expect(out.length).toBeLessThanOrEqual(301);
    expect(out.endsWith("…")).toBe(true);
  });

  it("survives non-Error values", () => {
    expect(describeError("plain string")).toBe("plain string");
    expect(describeError(null)).toBe("Unknown error");
    expect(describeError(undefined)).toBe("Unknown error");
  });
});

describe("isNetworkError", () => {
  it("still catches the offline cases it was written for", () => {
    expect(isNetworkError({ code: "ENOTFOUND" })).toBe(true);
    expect(isNetworkError(new Error("net::ERR_INTERNET_DISCONNECTED"))).toBe(true);
  });

  /* Ordering matters in the error handler: a network error returns early on the
     background path, so a 404 must not also look like one or the feed-missing
     branch would never be reached on a manual check. */
  it("does not classify a missing feed as a network failure", () => {
    expect(isNetworkError(realGithub404())).toBe(false);
  });
});
