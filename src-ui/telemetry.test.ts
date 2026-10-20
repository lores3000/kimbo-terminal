// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const initMock = vi.fn();
vi.mock("@sentry/browser", () => ({ init: (...args: unknown[]) => initMock(...args) }));
vi.mock("tauri-plugin-sentry-api", () => ({ defaultOptions: { _marker: true } }));

beforeEach(() => {
  vi.resetModules(); // reset telemetry.ts's module-level `started` flag
  initMock.mockClear();
});

async function loadInit() {
  return (await import("./telemetry")).initTelemetry;
}

describe("initTelemetry (opt-in gate)", () => {
  it("does nothing when telemetry is disabled", async () => {
    const initTelemetry = await loadInit();
    initTelemetry(false);
    expect(initMock).not.toHaveBeenCalled();
  });

  it("initializes Sentry once when enabled, with PII disabled", async () => {
    const initTelemetry = await loadInit();
    initTelemetry(true);
    initTelemetry(true); // idempotent — must not double-init
    expect(initMock).toHaveBeenCalledTimes(1);
    const options = initMock.mock.calls[0][0];
    expect(options).toMatchObject({
      _marker: true,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        stackFrameVariables: false,
      },
    });
    expect(options).not.toHaveProperty("sendDefaultPii");
  });

  it("strips user and host from every event before it leaves the webview", async () => {
    const initTelemetry = await loadInit();
    initTelemetry(true);
    const { beforeSend } = initMock.mock.calls[0][0];
    const event = beforeSend({
      message: "boom",
      user: { ip_address: "{{auto}}", id: "u1" },
      server_name: "lucas-mac",
      tags: { kept: "yes" },
    });
    expect(event).toEqual({ message: "boom", tags: { kept: "yes" } });
  });
});
