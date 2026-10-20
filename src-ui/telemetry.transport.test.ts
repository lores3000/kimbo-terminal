// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

// The plugin's transport hands every envelope to the Rust client over Tauri
// IPC; the Rust side owns the real DSN. Stand in for the IPC bridge the way
// the webview provides it (the plugin bundles its own copy of @tauri-apps/api,
// so mocking the module would miss it) and check an event gets that far with
// the Sentry browser SDK in use.
const invoke = vi.fn(async (..._args: unknown[]) => undefined);
(window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
  invoke: (...args: unknown[]) => invoke(...args),
  transformCallback: () => 0,
};

import * as Sentry from "@sentry/browser";
import { initTelemetry } from "./telemetry";

describe("telemetry transport", () => {
  it("delivers a captured event to the Rust client with user and host stripped", async () => {
    initTelemetry(true);
    Sentry.setUser({ id: "u1", ip_address: "{{auto}}" });
    Sentry.captureMessage("hello from the webview");
    await Sentry.flush(2000);

    const envelopes = invoke.mock.calls.filter((c) => c[0] === "plugin:sentry|envelope");
    expect(envelopes).toHaveLength(1);
    const body = String((envelopes[0][1] as { envelope: unknown }).envelope);
    expect(body).toContain("hello from the webview");
    expect(body).not.toContain("ip_address");
    expect(body).not.toContain('"user"');
    expect(body).not.toContain("server_name");
  });
});
