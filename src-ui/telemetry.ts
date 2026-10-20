import * as Sentry from "@sentry/browser";
import { defaultOptions } from "tauri-plugin-sentry-api";

let started = false;

/** Initialize opt-in error reporting for the webview. No-op unless telemetry is
 *  enabled (Settings → Privacy, persisted in config.toml). Events are routed
 *  through the Tauri Sentry plugin to the Rust client — which only carries a
 *  DSN when telemetry is enabled — so nothing leaves the machine when off.
 *  Sentry 11 collects user info, headers, bodies and query strings by default;
 *  every category is switched off here, and `beforeSend` strips whatever an
 *  integration still attaches, so only the error report itself is sent. */
export function initTelemetry(enabled: boolean): void {
  if (!enabled || started) return;
  started = true;
  try {
    Sentry.init({
      ...defaultOptions,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        stackFrameVariables: false,
      },
      beforeSend(event) {
        delete event.user;
        delete event.server_name;
        return event;
      },
    });
  } catch (e) {
    console.warn("[kimbo.telemetry] init failed:", e);
  }
}
