"use strict";
const electron = require("electron");
const api = {};
const ALLOWED_INVOKE = new Set([
  "check-chocolatey",
  "check-winget",
  "clear-corex-cache",
  "create-corex-restore-point",
  "create-restore-point",
  "delete-all-restore-points",
  "delete-old-corex-backups",
  "dns:apply",
  "dns:flush-cache",
  "dns:get-current",
  "dns:get-adapters",
  "dns:ping-all",
  "dns:reset",
  "dns:test",
  "driver-update:check-for-updates",
  "driver-update:get-installed-drivers",
  "driver-update:install-updates",
  "get-restore-points",
  "get-system-info",
  "get-user-name",
  "handle-apps",
  "install-chocolatey",
  "install-winget",
  "network:get-stats",
  "nvidia-inspector",
  "open-devtools",
  "open-log-folder",
  "optimize-memory",
  "restart",
  "restart-explorer",
  "restore-restore-point",
  "run-powershell",
  "run-powershell-window",
  "startup:get-items",
  "startup:toggle-item",
  "system:get-disk-io",
  "system:get-live-metrics",
  "system:is-admin",
  "system:run-as-admin",
  "tray:get",
  "tray:set",
  "tweak-backup:delete",
  "tweak-backup:list",
  "tweak-backup:load",
  "tweak-backup:save",
  "tweak-states:load",
  "tweak-states:save",
  "tweak:active",
  "tweak:apply",
  "tweak:unapply",
  "tweaks:fetch",
  "updater:check",
  "updater:download",
  "updater:get-version",
  "updater:install"
]);
const ALLOWED_SEND = new Set([
  "window-close",
  "window-minimize",
  "window-toggle-maximize",
  "updater:download",
  "updater:install",
  "updater:check"
]);
const ALLOWED_LISTEN = new Set([
  "updater:available",
  "updater:not-available",
  "updater:download-progress",
  "updater:downloaded",
  "updater:error",
  "updater:install",
  "install-progress",
  "install-complete",
  "install-error",
  "window-close",
  "window-minimize",
  "window-toggle-maximize"
]);
const LOG_CHANNEL = "__ELECTRON_LOG__";
function isAllowed(set, channel) {
  const name = typeof channel === "string" ? channel : "";
  if (!name) return false;
  if (set.has(name)) return true;
  if (name === LOG_CHANNEL || name === "__ELECTRON_LOG_IPC__") return true;
  if (/^(window-|updater:|tweak|dns:|driver-update:|startup:|system:|network:|tweak-backup:|tweak-states:)/.test(name)) return true;
  return false;
}
const electronAPI = {
  ipcRenderer: {
    send: (channel, ...args) => {
      if (!isAllowed(ALLOWED_SEND, channel)) {
        console.warn("[CoreX] blocked ipc send:", channel);
        return;
      }
      electron.ipcRenderer.send(channel, ...args);
    },
    invoke: (channel, ...args) => {
      if (!isAllowed(ALLOWED_INVOKE, channel)) {
        console.warn("[CoreX] blocked ipc invoke:", channel);
        return Promise.reject(new Error("IPC channel not allowed: " + channel));
      }
      return electron.ipcRenderer.invoke(channel, ...args);
    },
    on: (channel, listener) => {
      if (!isAllowed(ALLOWED_LISTEN, channel)) {
        console.warn("[CoreX] blocked ipc on:", channel);
        return () => {};
      }
      electron.ipcRenderer.on(channel, listener);
      return () => {
        electron.ipcRenderer.removeListener(channel, listener);
      };
    },
    once: (channel, listener) => {
      if (!isAllowed(ALLOWED_LISTEN, channel)) {
        console.warn("[CoreX] blocked ipc once:", channel);
        return;
      }
      electron.ipcRenderer.once(channel, listener);
    },
    removeListener: (channel, listener) => electron.ipcRenderer.removeListener(channel, listener),
    removeAllListeners: (channel) => electron.ipcRenderer.removeAllListeners(channel)
  }
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error("[CoreX] contextBridge failed:", error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
