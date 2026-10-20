"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const log = require("electron-log");
const fs = require("fs");
const util = require("util");
const child_process = require("child_process");
const os = require("os");
const si = require("systeminformation");
const fs$1 = require("fs/promises");
const electronUpdater = require("electron-updater");
const Store = require("electron-store");
const PS_TIMEOUT_MS = 5 * 60 * 1e3;
const PS_LONG_TIMEOUT_MS = 15 * 60 * 1e3;
const PS_MAX_BUFFER = 20 * 1024 * 1024;
const BRAND_ALIASES = {
  "corex.ico": "fylo.ico",
  "fylo.ico": "corex.ico",
  "corex-nvidia.nip": "fylo-nvidia.nip",
  "fylo-nvidia.nip": "corex-nvidia.nip"
};
function getResourceDirCandidates() {
  const dirs = [];
  if (electron.app.isPackaged) {
    dirs.push(process.resourcesPath, path.join(process.resourcesPath, "resources"), path.join(electron.app.getAppPath(), "resources"));
  } else {
    dirs.push(path.join(process.cwd(), "resources"), path.join(__dirname, "..", "..", "resources"));
  }
  return dirs;
}
function getAppResource(fileName) {
  const names = [fileName];
  if (BRAND_ALIASES[fileName]) names.push(BRAND_ALIASES[fileName]);
  for (const dir of getResourceDirCandidates()) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return path.join(getResourceDirCandidates()[0], fileName);
}
function sanitizeScriptName(name) {
  const cleaned = String(name == null ? "" : name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  return cleaned || "script";
}
function psQuote(value) {
  return `'${String(value == null ? "" : value).replace(/'/g, "''")}'`;
}
const HOSTNAME_RE = /^[a-zA-Z0-9]([a-zA-Z0-9._-]{0,251}[a-zA-Z0-9])?$/;
const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const PACKAGE_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,199}$/;
const UPDATE_ID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
function isTrustedSender(event) {
  try {
    const frame = event && event.senderFrame;
    if (!frame || typeof frame.url !== "string") return true;
    const url = frame.url;
    if (url.startsWith("file://")) return true;
    if (utils.is.dev && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/.test(url)) return true;
    console.warn(`[CoreX] Blocked IPC from untrusted frame: ${url}`);
    return false;
  } catch (error) {
    return true;
  }
}
const rawIpcHandle = electron.ipcMain.handle.bind(electron.ipcMain);
electron.ipcMain.handle = (channel, listener) => rawIpcHandle(channel, (event, ...args) => {
  if (!isTrustedSender(event)) {
    throw new Error(`Blocked IPC request on untrusted channel: ${channel}`);
  }
  return listener(event, ...args);
});
function createTray(mainWindow) {
  const tray = new electron.Tray(electron.nativeImage.createFromPath(getAppResource("corex.ico")));
  const contextMenu = electron.Menu.buildFromTemplate([
    { label: "Open Window", click: () => mainWindow.show() },
    { label: "Quit", click: () => electron.app.quit() }
  ]);
  tray.setToolTip("CoreX");
  tray.setTitle("CoreX");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => ToggleWindowState(mainWindow));
  return tray;
}
function ToggleWindowState(mainWindow) {
  mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
}
const execPromise$1 = util.promisify(child_process.exec);
console.log = log.log;
console.error = log.error;
console.warn = log.warn;
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
async function executePowerShell(_, props) {
  const options = props || {};
  const script = typeof options.script === "string" ? options.script : "";
  const name = sanitizeScriptName(options.name);
  const timeout = Number.isFinite(options.timeout) && options.timeout > 0 ? options.timeout : PS_TIMEOUT_MS;
  if (!script.trim()) {
    return { success: false, error: `Empty PowerShell script for [${name}]` };
  }
  const tempDir = path.join(electron.app.getPath("userData"), "scripts");
  const tempFile = path.join(tempDir, `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.ps1`);
  try {
    ensureDirectoryExists(tempDir);
    let attempt = 0;
    while (true) {
      attempt += 1;
      await fs.promises.writeFile(tempFile, script, "utf8");
      try {
        const { stdout, stderr } = await execPromise$1(
          `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tempFile}"`,
          { timeout, maxBuffer: PS_MAX_BUFFER, windowsHide: true, killSignal: "SIGKILL" }
        );
        if (stderr) {
          console.warn(`PowerShell stderr [${name}]:`, stderr);
        }
        console.log(`PowerShell stdout [${name}]:`, stdout);
        return { success: true, output: stdout || "", warnings: stderr || "" };
      } catch (error) {
        const msg = String(error.message || "");
        const scriptMissing = /does not exist|is not recognized|cannot find the path/i.test(msg);
        if (scriptMissing && attempt < 2) {
          console.warn(`PowerShell script [${name}] vanished before run, rewriting and retrying`);
          continue;
        }
        const timedOut = error.killed || /timed? ?out/i.test(msg);
        const message = timedOut ? `PowerShell script [${name}] timed out after ${Math.round(timeout / 1e3)}s` : msg;
        console.error(`PowerShell execution error [${name}]:`, message);
        return { success: false, error: message, output: error.stdout || "" };
      }
    }
  } finally {
    await fs.promises.unlink(tempFile).catch(() => {});
  }
}
async function runPowerShellInWindow(_, props) {
  const options = props || {};
  const script = typeof options.script === "string" ? options.script : "";
  const name = sanitizeScriptName(options.name);
  const noExit = options.noExit !== false;
  if (!script.trim()) {
    return { success: false, error: `Empty PowerShell script for [${name}]` };
  }
  try {
    const tempDir = path.join(electron.app.getPath("userData"), "scripts");
    ensureDirectoryExists(tempDir);
    const tempFile = path.join(tempDir, `${name}-${Date.now()}.ps1`);
    await fs.promises.writeFile(tempFile, script, "utf8");
    const noExitFlag = noExit ? "-NoExit" : "";
    const command = `start powershell.exe ${noExitFlag} -ExecutionPolicy Bypass -File "${tempFile}"`;
    child_process.exec(command, (error) => {
      if (error) {
        console.error(`Error launching PowerShell window [${name}]:`, error);
      }
    });
    return { success: true };
  } catch (error) {
    console.error(`Error in runPowerShellInWindow [${name}]:`, error);
    return { success: false, error: error.message };
  }
}
const setupPowerShellHandlers = () => {
  electron.ipcMain.handle("run-powershell-window", runPowerShellInWindow);
  electron.ipcMain.handle("run-powershell", executePowerShell);
  electron.ipcMain.handle("check-chocolatey", async () => {
    try {
      const userChocoPath = path.join(
        process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Local"),
        "Temp",
        "chocolatey",
        "bin",
        "choco.exe"
      );
      const systemChocoPath = path.join("C:\\ProgramData\\chocolatey\\bin\\choco.exe");
      const installed = fs.existsSync(userChocoPath) || fs.existsSync(systemChocoPath);
      if (installed) {
        console.log("Chocolatey is installed");
      } else {
        console.log("Chocolatey is not installed");
      }
      return { success: true, installed };
    } catch (error) {
      console.error("Error checking Chocolatey installation:", error);
      return { success: false, installed: false };
    }
  });
  electron.ipcMain.handle("install-chocolatey", async (event) => {
    try {
      const installScript = `
$ErrorActionPreference = "Stop"
$chocoInstallDir = "$env:LOCALAPPDATA\\Temp\\chocolatey"
$env:ChocolateyInstall = $chocoInstallDir

if (!(Test-Path $chocoInstallDir)) {
  New-Item -ItemType Directory -Path $chocoInstallDir -Force | Out-Null
}

if (!(Test-Path "$chocoInstallDir\\choco.exe")) {
  Set-ExecutionPolicy Bypass -Scope Process -Force
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
  Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

$currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentUserPath -notlike "*$chocoInstallDir\\bin*") {
  [Environment]::SetEnvironmentVariable("Path", "$currentUserPath;$chocoInstallDir\\bin", "User")
  $env:Path = "$env:Path;$chocoInstallDir\\bin"
}

Write-Output "Chocolatey installed to $chocoInstallDir"
`;
      const result = await executePowerShell(event, {
        script: installScript,
        name: "install-chocolatey"
      });
      if (result.success) {
        return { installed: true, version: result.output.trim() };
      } else {
        return { installed: false };
      }
    } catch (error) {
      console.error("Error installing Chocolatey:", error);
      return { installed: false };
    }
  });
  electron.ipcMain.handle("handle-apps", async (event, { action, apps, source }) => {
    const chocoBinPath = path.join(
      process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Local"),
      "Temp",
      "chocolatey",
      "bin",
      "choco.exe"
    );
    const chocoCmd = fs.existsSync(chocoBinPath) ? `"${chocoBinPath}"` : "choco";
    switch (action) {
      case "install":
        for (const app2 of Array.isArray(apps) ? apps : []) {
          if (typeof app2 !== "string" || !PACKAGE_ID_RE.test(app2)) {
            console.error(`Rejected invalid package id: ${JSON.stringify(app2)}`);
            if (exports.mainWindow) exports.mainWindow.webContents.send("install-error");
            continue;
          }
          let command;
          if (source === "Chocolatey") {
            command = `${chocoCmd} install ${app2} -y --no-progress --user`;
          } else {
            command = `winget install ${app2} --silent --accept-package-agreements --accept-source-agreements`;
          }
          if (!exports.mainWindow) throw new Error("Main window is not available");
          exports.mainWindow.webContents.send("install-progress", `${app2}`);
          const result = await executePowerShell(event, { script: command, name: `Install-${app2}`, timeout: PS_LONG_TIMEOUT_MS });
          const isChocoFailure = source === "Chocolatey" && !result.success && result.output && !result.output.includes("already installed");
          if (result.success || result.output && result.output.includes("already installed")) {
            console.log(`Successfully installed ${app2}`);
          } else if (isChocoFailure) {
            console.log(`Initial install failed for ${app2}, retrying with --pre flag`);
            const retryCommand = `${chocoCmd} install ${app2} -y --no-progress --pre`;
            const retryResult = await executePowerShell(event, {
              script: retryCommand,
              name: `Install-${app2}-pre`,
              timeout: PS_LONG_TIMEOUT_MS
            });
            if (retryResult.success || retryResult.output && retryResult.output.includes("already installed")) {
              console.log(`Successfully installed ${app2} with --pre flag`);
            } else {
              console.error(`Failed to install ${app2} even with --pre flag:`, retryResult.error);
              exports.mainWindow.webContents.send("install-error");
            }
          } else {
            console.error(`Failed to install ${app2}:`, result.error);
            exports.mainWindow.webContents.send("install-error");
          }
        }
        if (exports.mainWindow) {
          exports.mainWindow.webContents.send("install-complete");
        }
        break;
      case "uninstall":
        for (const app2 of Array.isArray(apps) ? apps : []) {
          if (typeof app2 !== "string" || !PACKAGE_ID_RE.test(app2)) {
            console.error(`Rejected invalid package id: ${JSON.stringify(app2)}`);
            if (exports.mainWindow) exports.mainWindow.webContents.send("install-error");
            continue;
          }
          let command;
          if (source === "Chocolatey") {
            command = `${chocoCmd} uninstall ${app2} -y --no-progress`;
          } else {
            command = `winget uninstall ${app2} --silent`;
          }
          if (!exports.mainWindow) throw new Error("Main window is not available");
          exports.mainWindow.webContents.send("install-progress", `${app2}`);
          const result = await executePowerShell(event, {
            script: command,
            name: `Uninstall-${app2}`,
            timeout: PS_LONG_TIMEOUT_MS
          });
          if (result.success) {
            console.log(`Successfully uninstalled ${app2}`);
          } else {
            console.error(`Failed to uninstall ${app2}:`, result.error);
            exports.mainWindow.webContents.send("install-error");
          }
        }
        if (exports.mainWindow) {
          exports.mainWindow.webContents.send("install-complete");
        }
        break;
      case "check-installed":
        try {
          const packageList = (Array.isArray(apps) ? apps : []).filter(
            (appId) => typeof appId === "string" && PACKAGE_ID_RE.test(appId)
          );
          if (packageList.length === 0) {
            if (exports.mainWindow) {
              exports.mainWindow.webContents.send("installed-apps-checked", { success: true, installed: [] });
            }
            break;
          }
          const result = await executePowerShell(event, {
            script: "winget list",
            name: "check-installed",
            timeout: PS_LONG_TIMEOUT_MS
          });
          if (!result.success) {
            throw new Error(result.error);
          }
          const escapeRegExp = (string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          };
          const installedAppIds = packageList.filter((appId) => {
            const regex = new RegExp(`\\b${escapeRegExp(appId)}\\b`, "i");
            return regex.test(result.output);
          });
          if (exports.mainWindow) {
            exports.mainWindow.webContents.send("installed-apps-checked", {
              success: true,
              installed: installedAppIds
            });
          }
        } catch (error) {
          console.error("Failed to check installed apps:", error);
          if (exports.mainWindow) {
            exports.mainWindow.webContents.send("installed-apps-checked", {
              success: false,
              error: error.message
            });
          }
        }
        break;
      default:
        console.error(`Unknown action: ${action}`);
    }
  });
  console.log("[CoreX main/powershell.ts]: PowerShell handlers setup complete");
};
console.log = log.log;
console.error = log.error;
console.warn = log.warn;
function isIntegratedController(model) {
  const m = model.toLowerCase();
  return m.includes("integrated") || m.includes("intel") && (m.includes("hd") || m.includes("uhd") || m.includes("iris")) || m.includes("amd") && m.includes("radeon") && m.includes("graphics") || m.includes("amd") && m.includes("vega") && !m.includes("rx") || m.includes("intel graphics");
}
function isDedicatedController(model) {
  const m = model.toLowerCase();
  return !isIntegratedController(m) && (m.includes("nvidia") || m.includes("amd") && (m.includes("radeon") || m.includes("rx") || m.includes("vega") || m.includes("firepro") || m.includes("instinct")) || m.includes("intel") && m.includes("arc"));
}
async function detectGPU() {
  const defaults = {
    model: "GPU not found",
    vram: "N/A",
    hasGPU: false,
    isNvidia: false,
    integratedModel: "Not detected",
    hasIntegratedGPU: false
  };
  try {
    const graphicsData = await si.graphics();
    if (!graphicsData.controllers || graphicsData.controllers.length === 0) {
      return defaults;
    }
    const integratedControllers = graphicsData.controllers.filter(
      (c) => isIntegratedController(c.model || "")
    );
    const dedicatedControllers = graphicsData.controllers.filter(
      (c) => isDedicatedController(c.model || "")
    );
    const dedicatedGPU = dedicatedControllers.sort(
      (a, b) => (b.vram || 0) - (a.vram || 0)
    )[0];
    const integratedGPU = integratedControllers.sort(
      (a, b) => (b.vram || 0) - (a.vram || 0)
    )[0];
    const result = { ...defaults };
    if (integratedGPU) {
      result.integratedModel = integratedGPU.model || "Unknown Integrated GPU";
      result.hasIntegratedGPU = true;
    }
    if (dedicatedGPU) {
      result.model = dedicatedGPU.model || "Unknown GPU";
      result.vram = dedicatedGPU.vram ? `${Math.round(dedicatedGPU.vram / 1024)} GB` : "Unknown";
      result.hasGPU = true;
      result.isNvidia = dedicatedGPU.model.toLowerCase().includes("nvidia");
    }
    return result;
  } catch (error) {
    console.error("Error detecting GPU:", error);
    return defaults;
  }
}
const execFilePromise = util.promisify(child_process.execFile);
const execRaw = util.promisify(child_process.exec);
const execPromise = (command, options) => execRaw(command, Object.assign({ timeout: PS_LONG_TIMEOUT_MS, maxBuffer: PS_MAX_BUFFER, windowsHide: true, killSignal: "SIGKILL" }, options || {}));
console.log = log.log;
console.error = log.error;
console.warn = log.warn;
async function getSystemInfo() {
  try {
    const [cpuData, osInfo, memLayout, diskLayout, fsSize, blockDevices] = await Promise.all([
      si.cpu(),
      si.osInfo(),
      si.memLayout(),
      si.diskLayout(),
      si.fsSize(),
      si.blockDevices()
    ]);
    let totalMemory = os.totalmem();
    const memoryType = memLayout.length > 0 ? memLayout[0].type : "Unknown";
    const cDrive = fsSize.find((d) => d.mount.toUpperCase().startsWith("C:"));
    let primaryDisk = null;
    if (cDrive) {
      const cBlock = blockDevices.find(
        (b) => b.mount && b.mount.toUpperCase().startsWith("C:")
      );
      if (cBlock) {
        primaryDisk = diskLayout.find(
          (disk) => disk.device?.toLowerCase() === cBlock.device?.toLowerCase() || disk.name?.toLowerCase().includes(cBlock.name?.toLowerCase())
        ) || null;
      }
    }
    const gpuInfo = await detectGPU();
    const versionScript = `(Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion").DisplayVersion`;
    const versionPsResult = await executePowerShell(null, {
      script: versionScript,
      name: "GetWindowsVersion"
    });
    const windowsVersion = versionPsResult.success ? versionPsResult.output.trim() : "Unknown";
    const disksHealth = [];
    try {
      const psScript = `
        Get-PhysicalDisk | Select-Object FriendlyName, MediaType, HealthStatus, OperationalStatus, Size | ConvertTo-Json
      `;
      const diskHealthResult = await executePowerShell(null, { script: psScript, name: "Get-DiskHealth" });
      const stdout = diskHealthResult.success ? diskHealthResult.output : "";
      if (stdout) {
        let parsed = JSON.parse(stdout.trim());
        if (!Array.isArray(parsed)) {
          parsed = [parsed];
        }
        for (const disk of parsed) {
          if (disk && disk.FriendlyName) {
            const healthMap = { Healthy: 100, Warning: 60, Unhealthy: 30, Unknown: 100 };
            const healthVal = healthMap[disk.HealthStatus] !== void 0 ? healthMap[disk.HealthStatus] : 100;
            disksHealth.push({
              name: disk.FriendlyName,
              media_type: disk.MediaType || "Unspecified",
              health: healthVal,
              wear_level: null,
              size: disk.Size ? `${(disk.Size / 1024 / 1024 / 1024).toFixed(1)} GB` : "Unknown",
              status: disk.OperationalStatus || "Unknown"
            });
          }
        }
      }
    } catch (psError) {
      console.log("PowerShell disk health query failed:", psError.message);
    }
    try {
      const reliabilityScript = `
        Get-PhysicalDisk | Get-StorageReliabilityCounter | Select-Object FriendlyName, @{Name='WearLevel';Expression={ [math]::Round((($_.PercentUsed / 1024) * 100), 2) }} | ConvertTo-Json
      `;
      const reliabilityResult = await executePowerShell(null, { script: reliabilityScript, name: "Get-DiskReliability" });
      const stdout = reliabilityResult.success ? reliabilityResult.output : "";
      if (stdout) {
        let parsed = JSON.parse(stdout.trim());
        if (!Array.isArray(parsed)) {
          parsed = [parsed];
        }
        for (const counter of parsed) {
          if (counter && counter.FriendlyName && counter.WearLevel !== null) {
            const match = disksHealth.find((d) => d.name === counter.FriendlyName);
            if (match) {
              const wearVal = parseFloat(counter.WearLevel);
              if (!isNaN(wearVal)) {
                match.wear_level = wearVal;
                if (match.health === null || match.health === 100) {
                  match.health = 100 - wearVal;
                }
              }
            }
          }
        }
      }
    } catch (relError) {
      console.log("PowerShell reliability counter failed:", relError.message);
    }
    if (disksHealth.length === 0) {
      try {
        const layout = await si.diskLayout();
        for (const disk of layout) {
          const healthVal = disk.smartStatus === "Ok" ? 100 : 50;
          disksHealth.push({
            name: disk.name || "Unknown Drive",
            media_type: disk.type || "Unspecified",
            health: healthVal,
            wear_level: null,
            size: disk.size ? `${(disk.size / 1024 / 1024 / 1024).toFixed(1)} GB` : "Unknown",
            status: disk.smartStatus || "Unknown"
          });
        }
      } catch (siError) {
        console.log("si.diskLayout query failed:", siError.message);
      }
    }
    if (disksHealth.length === 0 && !electron.app.isPackaged) {
      disksHealth.push(
        {
          name: "PIXEL PN 71 512GB (Mock SSD)",
          media_type: "SSD",
          health: 98,
          wear_level: 2,
          size: "476.9 GB",
          status: "OK"
        },
        {
          name: "ST1000LM035-1RK172 (Mock HDD)",
          media_type: "HDD",
          health: 100,
          wear_level: 0,
          size: "931.5 GB",
          status: "OK"
        }
      );
    }
    let primaryDiskHealth = disksHealth[0] || null;
    if (cDrive && cDrive.device) {
      const match = disksHealth.find(
        (d) => d.name.toLowerCase().includes(cDrive.device.toLowerCase())
      );
      if (match) {
        primaryDiskHealth = match;
      }
    }
    const ssdHealth = primaryDiskHealth ? primaryDiskHealth.health : 100;
    const ssdWearLevel = primaryDiskHealth && primaryDiskHealth.wear_level !== null ? primaryDiskHealth.wear_level : 0;
    let cpuTemp = null;
    try {
      const tempInfo = await si.cpuTemperature();
      if (tempInfo && tempInfo.main !== null && tempInfo.main > 0) {
        cpuTemp = tempInfo.main;
      }
    } catch (tempError) {
      console.log("Failed to get CPU temperature via systeminformation:", tempError.message);
    }
    if (cpuTemp === null) {
      try {
        const _wmiPs = `
          $z = Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue
          if ($z) { $z | ForEach-Object { [math]::Round($_.CurrentTemperature/10) } }
        `;
        const _wmiR = await executePowerShell(null, { script: _wmiPs, name: "GetCpuTempWmi" });
        if (_wmiR.success && _wmiR.output.trim()) {
          const _vals = _wmiR.output.trim().split(/\s+/).map(v => parseInt(v, 10)).filter(v => !isNaN(v));
          if (_vals.length > 0) cpuTemp = Math.min(..._vals);
        }
      } catch (_e) {
        console.log("CPU temp WMI fallback failed:", _e.message);
      }
    }
    if (cpuTemp === null) {
      try {
        const _load = await si.currentLoad();
        const pct = parseFloat(_load.currentLoad || 0) / 100.0;
        const baseTemp = 35;
        const est = Math.round(baseTemp + pct * 40);
        cpuTemp = Math.max(25, Math.min(90, est));
      } catch (_e) {
        console.log("CPU temp load-estimation fallback failed:", _e.message);
      }
    }
    let gpuTemp = null;
    try {
      const { stdout } = await execPromise("nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits");
      if (stdout) {
        const val = parseInt(stdout.trim(), 10);
        if (!isNaN(val)) {
          gpuTemp = val;
        }
      }
    } catch {
    }
    if (gpuTemp === null) {
      try {
        const _gpuPs = `
          $k = Get-ItemProperty -Path "HKLM:\\SOFTWARE\\AMD\\HDC" -ErrorAction SilentlyContinue
          if ($k) { $k.Temperature }
        `;
        const _gr = await executePowerShell(null, { script: _gpuPs, name: "GetGpuTemp" });
        if (_gr.success && _gr.output.trim()) {
          const gv = parseInt(_gr.output.trim(), 10);
          if (!isNaN(gv)) gpuTemp = gv;
        }
      } catch (_e) {
        console.log("GPU temp AMD fallback failed:", _e.message);
      }
    }
    let fanSpeedRPM = null;
    try {
      const fanPs = `Get-CimInstance -Namespace root\\wmi -ClassName Win32_Fan -ErrorAction SilentlyContinue | Select-Object -First 1 EstimatedRotationSpeed`;
      const fanResult = await executePowerShell(null, { script: fanPs, name: "GetFanSpeed" });
      const fanOut = fanResult.success ? fanResult.output : "";
      if (fanOut) {
        const fv = parseInt(fanOut.trim(), 10);
        if (!isNaN(fv) && fv > 0) fanSpeedRPM = fv;
      }
    } catch (_fanErr) {
      console.log("Fan speed detection failed:", _fanErr.message);
    }
    return {
      cpu_model: cpuData.brand,
      cpu_cores: cpuData.physicalCores,
      cpu_threads: cpuData.threads || cpuData.physicalCores,
      gpu_model: gpuInfo.model,
      vram: gpuInfo.vram,
      hasGPU: gpuInfo.hasGPU,
      isNvidia: gpuInfo.isNvidia,
      integrated_gpu: gpuInfo.integratedModel,
      hasIntegratedGPU: gpuInfo.hasIntegratedGPU,
      memory_total: totalMemory,
      memory_type: memoryType,
      os: osInfo.distro || "Windows",
      os_version: windowsVersion || "Unknown",
      disk_model: primaryDisk?.name || primaryDisk?.device || "Unknown Storage",
      disk_size: cDrive?.size ? `${(cDrive.size / 1024 / 1024 / 1024).toFixed(1)} GB` : "Unknown",
      disk_free: cDrive?.available ? `${(cDrive.available / 1024 / 1024 / 1024).toFixed(1)} GB` : "Unknown",
      disk_used: cDrive?.used ? `${(cDrive.used / 1024 / 1024 / 1024).toFixed(1)} GB` : "Unknown",
      // PC Status fields
      uptime_seconds: os.uptime(),
      cpu_temperature: cpuTemp || void 0,
      cpu_fan_speed_rpm: fanSpeedRPM || void 0,
      gpu_temperature: gpuTemp || void 0,
      ssd_health: ssdHealth,
      ssd_wear_level: ssdWearLevel,
      disks_health: disksHealth
    };
  } catch (error) {
    console.error("Failed to get system info:", error);
    throw error;
  }
}
function restartSystem() {
  try {
    child_process.exec("shutdown /r /t 0", { windowsHide: true, timeout: 1e4 });
    return { success: true };
  } catch (error) {
    console.error("Failed to restart system:", error);
    throw error;
  }
}
function restartExplorer() {
  try {
    child_process.exec("taskkill /f /im explorer.exe & start explorer.exe", { windowsHide: true, timeout: 15e3 });
    return { success: true };
  } catch (error) {
    console.error("Failed to restart explorer:", error);
    return { success: false, error: error.message };
  }
}
async function optimizeMemory() {
  try {
    const script = `
      Add-Type @'
using System;
using System.Runtime.InteropServices;
public class MemOpt {
    [DllImport("psapi.dll")]
    public static extern int EmptyWorkingSet(IntPtr hwProc);
}
'@
      $before = (Get-Process | Measure-Object WorkingSet64 -Sum).Sum
      $count = 0
      Get-Process | ForEach-Object {
          try {
              [MemOpt]::EmptyWorkingSet($_.Handle) | Out-Null
              $count++
          } catch {}
      }
      Start-Sleep -Milliseconds 500
      $after = (Get-Process | Measure-Object WorkingSet64 -Sum).Sum
      $freed = [Math]::Max(0, ($before - $after) / 1MB)
      Write-Output "$([Math]::Round($freed, 2))|$count"
    `;
    const result = await executePowerShell(null, { script, name: "Optimize-Memory" });
    if (result.success && result.output) {
      const parts = result.output.trim().split("|");
      const freedMB = parseFloat(parts[0]) || 0;
      const processCount = parseInt(parts[1]) || 0;
      return { success: true, freedMB, processCount };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("Failed to optimize memory:", error);
    return { success: false, error: error.message };
  }
}
function getUserName() {
  return os.userInfo().username;
}
function getCacheDirCandidates(kind) {
  const legacyRoot = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  const dirs = [];
  try {
    dirs.push(path.join(electron.app.getPath("userData"), kind));
  } catch (error) {}
  try {
    dirs.push(kind === "logs" ? electron.app.getPath("logs") : path.join(electron.app.getPath("logs"), "..", "scripts"));
  } catch (error) {}
  dirs.push(path.join(legacyRoot, "fylo", kind));
  dirs.push(path.join(legacyRoot, "corex", kind));
  return [...new Set(dirs.filter(Boolean).map((dir) => path.normalize(dir)))];
}
function clearDirectoryFiles(dirPath) {
  const errors = [];
  let cleared = false;
  if (!fs.existsSync(dirPath)) return { cleared, errors };
  try {
    for (const file of fs.readdirSync(dirPath)) {
      const filePath = path.join(dirPath, file);
      try {
        if (fs.lstatSync(filePath).isFile()) fs.unlinkSync(filePath);
      } catch (err) {
        errors.push(`Failed to delete file: ${file} - ${err.message}`);
      }
    }
    cleared = true;
    console.log(`Cleared files in ${dirPath}`);
  } catch (err) {
    errors.push(`Failed to read ${dirPath} - ${err.message}`);
  }
  return { cleared, errors };
}
function clearCoreXCache() {
  try {
    const errors = [];
    let anyCleared = false;
    for (const kind of ["scripts", "logs"]) {
      for (const dir of getCacheDirCandidates(kind)) {
        const res = clearDirectoryFiles(dir);
        anyCleared = anyCleared || res.cleared;
        errors.push(...res.errors);
      }
    }
    if (errors.length === 0) return { success: true };
    return { success: anyCleared, error: errors.join(" | ") };
  } catch (error) {
    console.error("Failed to clear CoreX scripts or logs directory:", error);
    return { success: false, error: error.message };
  }
}
function openLogFolder() {
  let candidates = [];
  try {
    candidates.push(electron.app.getPath("logs"));
  } catch (error) {}
  candidates = candidates.concat(getCacheDirCandidates("logs"), getCacheDirCandidates("scripts"))
    .filter((dir) => dir && fs.existsSync(dir));
  if (candidates.length > 0) {
    electron.shell.openPath(candidates[0]);
    return { success: true };
  }
  console.warn("CoreX log directory does not exist.");
  return { success: false, error: "Log directory does not exist." };
}
const ensureWingetScript = `
$TestMode = $false  # Set $true to force winget install for testing

function Check-Winget {
    try {
        $null = winget --version 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Show-InstallerGUI {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $form = New-Object System.Windows.Forms.Form
    $form.Text = "CoreX: Winget Installer"
    $form.Size = New-Object System.Drawing.Size(600,400)
    $form.StartPosition = "CenterScreen"

    $label = New-Object System.Windows.Forms.Label
    $label.Text = "Welcome! CoreX needs Winget to install apps."
    $label.AutoSize = $true
    $label.Location = New-Object System.Drawing.Point(20,20)
    $form.Controls.Add($label)

    $outputBox = New-Object System.Windows.Forms.TextBox
    $outputBox.Multiline = $true
    $outputBox.ScrollBars = 'Vertical'
    $outputBox.ReadOnly = $true
    $outputBox.Size = New-Object System.Drawing.Size(550,250)
    $outputBox.Location = New-Object System.Drawing.Point(20,60)
    $form.Controls.Add($outputBox)

    $closeButton = New-Object System.Windows.Forms.Button
    $closeButton.Text = "Close"
    $closeButton.Size = New-Object System.Drawing.Size(100,30)
    $closeButton.Location = New-Object System.Drawing.Point(240,320)
    $closeButton.Enabled = $false
    $closeButton.Add_Click({ $form.Close() })
    $form.Controls.Add($closeButton)

    function Append-Output {
        param($text)
        $outputBox.AppendText("$text\`r\`n")
        $outputBox.SelectionStart = $outputBox.Text.Length
        $outputBox.ScrollToCaret()
        [System.Windows.Forms.Application]::DoEvents()
    }

    # Create a runspace for background work
    $runspace = [runspacefactory]::CreateRunspace()
    $runspace.ApartmentState = "STA"
    $runspace.ThreadOptions = "ReuseThread"
    $runspace.Open()
    $runspace.SessionStateProxy.SetVariable("TestMode", $TestMode)

    $powershell = [powershell]::Create()
    $powershell.Runspace = $runspace

    [void]$powershell.AddScript({
        function Check-Winget {
            try {
                $null = winget --version 2>&1
                return $LASTEXITCODE -eq 0
            } catch {
                return $false
            }
        }

        $result = @{
            Success = $false
            Messages = @()
        }

        try {
            $result.Messages += "Checking for Winget..."
            $wingetInstalled = Check-Winget

            if ($TestMode -or -not $wingetInstalled) {
                $result.Messages += "Winget not found. Installing for CoreX..."
                
                try {
                    $result.Messages += "Attempting to register App Installer..."
                    
                    # Add timeout wrapper for AppX operations
                    $job = Start-Job -ScriptBlock {
                        Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe
                    }
                    
                    $completed = Wait-Job -Job $job -Timeout 60
                    if ($completed) {
                        Receive-Job -Job $job
                        Remove-Job -Job $job
                    } else {
                        Remove-Job -Job $job -Force
                        throw "Registration timed out after 60 seconds"
                    }
                    
                    Start-Sleep -Seconds 2
                    
                    if (Check-Winget) {
                        $result.Messages += "Winget installed successfully!"
                        $result.Success = $true
                    } else {
                        throw "Registration completed but winget not found"
                    }
                } catch {
                    $result.Messages += "Registration method failed: $($_.Exception.Message)"
                    $result.Messages += "Trying download method..."
                    
                    try {
                        $result.Messages += "Downloading latest App Installer package..."
                        $progressPreference = 'SilentlyContinue'
                        
                        # Add timeout to web requests
                        $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/microsoft/winget-cli/releases/latest" -TimeoutSec 30
                        $downloadUrl = ($releases.assets | Where-Object { $_.name -like "*.msixbundle" }).browser_download_url
                        
                        if (-not $downloadUrl) {
                            throw "Could not find download URL in GitHub release"
                        }
                        
                        $tempFile = Join-Path $env:TEMP "Microsoft.DesktopAppInstaller.msixbundle"
                        
                        $result.Messages += "Downloading from GitHub..."
                        Start-BitsTransfer -Source $downloadUrl -Destination $tempFile -TimeoutSec 120
                        
                        $result.Messages += "Installing package (this may take a minute)..."
                        
                        # Add timeout wrapper for installation
                        $job = Start-Job -ScriptBlock {
                            param($path)
                            Add-AppxPackage -Path $path
                        } -ArgumentList $tempFile
                        
                        $completed = Wait-Job -Job $job -Timeout 120
                        if ($completed) {
                            Receive-Job -Job $job
                            Remove-Job -Job $job
                        } else {
                            Remove-Job -Job $job -Force
                            throw "Installation timed out after 120 seconds"
                        }
                        
                        # Clean up
                        if (Test-Path $tempFile) {
                            Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
                        }
                        
                        Start-Sleep -Seconds 2
                        
                        if (Check-Winget) {
                            $result.Messages += "Winget installed successfully!"
                            $result.Success = $true
                        } else {
                            $result.Messages += "WARNING: Installation completed but winget command not available yet."
                            $result.Messages += "You may need to restart your terminal or computer."
                            $result.Success = $false
                        }
                    } catch {
                        $result.Messages += "ERROR: Failed to install Winget."
                        $result.Messages += $_.Exception.Message
                        $result.Messages += ""
                        $result.Messages += "Manual installation: Visit https://aka.ms/getwinget"
                        $result.Success = $false
                    }
                }
            } else {
                $result.Messages += "Winget is already installed. CoreX is ready to install apps!"
                $result.Success = $true
            }
        } catch {
            $result.Messages += "ERROR: Unexpected error occurred."
            $result.Messages += $_.Exception.Message
            $result.Success = $false
        }

        return $result
    })

    $handle = $powershell.BeginInvoke()

    # Poll for completion
    $timer = New-Object System.Windows.Forms.Timer
    $timer.Interval = 500
    $timer.Add_Tick({
        if ($handle.IsCompleted) {
            $timer.Stop()
            
            try {
                $result = $powershell.EndInvoke($handle)
                
                foreach ($message in $result.Messages) {
                    Append-Output $message
                }
                
                Append-Output ""
                Append-Output "You can now close this window."
            } catch {
                Append-Output "ERROR: Installation process failed."
                Append-Output $_.Exception.Message
            } finally {
                $closeButton.Enabled = $true
                $powershell.Dispose()
                $runspace.Close()
            }
        }
    })

    $form.Add_Shown({ $timer.Start() })
    
    # Clean up on form close
    $form.Add_FormClosing({
        if (-not $handle.IsCompleted) {
            $powershell.Stop()
        }
        $timer.Stop()
        $powershell.Dispose()
        $runspace.Close()
    })

    [void]$form.ShowDialog()
}

# --- Main Execution ---
if ($TestMode -or -not (Check-Winget)) {
    Show-InstallerGUI
} else {
    Write-Output "Winget is already installed. CoreX can install apps!"
}
`;
function ensureWinget() {
  const result = executePowerShell(null, {
    script: ensureWingetScript,
    name: "Ensure-Winget"
  });
  return result;
}
const setupSystemHandlers = () => {
  electron.ipcMain.handle("restart", restartSystem);
  electron.ipcMain.handle("open-log-folder", openLogFolder);
  electron.ipcMain.handle("clear-corex-cache", clearCoreXCache);
  electron.ipcMain.handle("get-system-info", getSystemInfo);
  electron.ipcMain.handle("get-user-name", getUserName);
  electron.ipcMain.handle("restart-explorer", restartExplorer);
  electron.ipcMain.handle("check-winget", async () => {
    try {
      await execFilePromise("winget", ["--version"]);
      console.log("Winget is installed");
      return { success: true, installed: true };
    } catch {
      console.log("Winget is not installed");
      return { success: true, installed: false };
    }
  });
  electron.ipcMain.handle("install-winget", ensureWinget);
  electron.ipcMain.handle("optimize-memory", optimizeMemory);
  electron.ipcMain.handle("system:get-disk-io", async () => {
    try {
      const fsSize = await si.fsSize();
      const disks = fsSize.filter((d) => d.fs && !d.fs.startsWith("squashfs") && d.size > 0).map((d) => ({
        mount: d.mount,
        type: d.type,
        size: d.size,
        used: d.used,
        available: d.available,
        use: d.use
      }));
      return { success: true, disks };
    } catch (error) {
      return { success: false, error: error.message, disks: [] };
    }
  });
  electron.ipcMain.handle("startup:get-items", async () => {
    try {
      const script = `
        $startupItems = @()
        $regPaths = @(
          "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
          "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
          "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce",
          "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce"
        )
        foreach ($path in $regPaths) {
          if (Test-Path $path) {
            $props = Get-ItemProperty -Path $path -ErrorAction SilentlyContinue
            if ($props) {
              $props.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
                $startupItems += [PSCustomObject]@{
                  name = $_.Name
                  command = $_.Value
                  location = $path -replace 'HKLM:\\', 'Local Machine' -replace 'HKCU:\\', 'Current User'
                  enabled = $true
                }
              }
            }
          }
        }
        $startupItems | ConvertTo-Json -Depth 3
      `;
      const result = await executePowerShell(null, { script, name: "Get-Startup" });
      if (result.success && result.output) {
        const output = result.output.trim();
        if (output === "" || output === "[]") return { success: true, items: [] };
        try {
          const parsed = JSON.parse(output);
          return { success: true, items: Array.isArray(parsed) ? parsed : [parsed] };
        } catch {
          return { success: true, items: [] };
        }
      }
      return { success: true, items: [] };
    } catch (error) {
      return { success: false, error: error.message, items: [] };
    }
  });
  electron.ipcMain.handle("startup:toggle-item", async (_event, { name, location, enable }) => {
    try {
      const regPath = location.replace("Local Machine", "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run").replace("Current User", "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run");
      if (enable) {
        return { success: true };
      } else {
        if (!/^HK(LM|CU):\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run(Once)?$/.test(regPath)) {
          return { success: false, error: "Invalid registry location" };
        }
        const script = `Remove-ItemProperty -Path ${psQuote(regPath)} -Name ${psQuote(String(name))} -Force -ErrorAction SilentlyContinue`;
        const result = await executePowerShell(null, { script, name: "Disable-Startup" });
        return { success: result.success, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  console.log("[CoreX main/system.ts]: System handlers setup complete");
};
console.log = log.log;
console.error = log.error;
console.warn = log.warn;
const userDataPath = electron.app.getPath("userData");
const tweaksStatePath = path.join(userDataPath, "tweakStates.json");
const isDev = !electron.app.isPackaged;
const tweaksDir = isDev ? path.join(process.cwd(), "tweaks") : path.join(electron.app.getAppPath(), "tweaks");
const getExePath = (exeName) => getAppResource(exeName);
async function loadTweaks() {
  const entries = await fs$1.readdir(tweaksDir, { withFileTypes: true });
  const tweaks = [];
  for (const dir of entries) {
    if (!dir.isDirectory()) continue;
    const name = dir.name;
    const folder = path.join(tweaksDir, name);
    const applyPath = path.join(folder, "apply.ps1");
    const metaPath = path.join(folder, "meta.json");
    const hasMeta = await fs$1.access(metaPath).then(() => true).catch(() => false);
    if (!hasMeta) continue;
    const unapplyPath = path.join(folder, "unapply.ps1");
    let psapply = "";
    let psunapply = "";
    try {
      psapply = await fs$1.readFile(applyPath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`Error reading apply.ps1 for tweak: ${name}`, error);
      }
    }
    try {
      psunapply = await fs$1.readFile(unapplyPath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`Error reading unapply.ps1 for tweak: ${name}`, error);
      }
    }
    let meta = {};
    try {
      meta = JSON.parse(await fs$1.readFile(metaPath, "utf8"));
    } catch (error) {
      console.warn(`Error reading meta.json for tweak: ${name}`, error);
      continue;
    }
    tweaks.push({
      name,
      psapply,
      psunapply: psunapply || "",
      ...meta
    });
  }
  return tweaks;
}
const getNipPath = () => getAppResource("corex-nvidia.nip");
function isGPUTweak(tweak) {
  return !!(tweak.category && tweak.category.includes("GPU"));
}
function isNvidiaTweak(tweak) {
  return tweak.name === "optimize-nvidia-settings";
}
function NvidiaProfileInspector() {
  const exePath = getExePath("nvidiaProfileInspector.exe");
  const nipPath = getNipPath();
  return new Promise((resolve, reject) => {
    child_process.exec(`"${exePath}" -silentImport "${nipPath}"`, { windowsHide: true, timeout: PS_LONG_TIMEOUT_MS }, (error, stdout, stderr) => {
      console.log("stdout:", stdout);
      console.log("stderr:", stderr);
      if (error) {
        console.error("Error:", error);
        reject(error);
      } else {
        resolve(stdout || "Completed with no output.");
      }
    });
  });
}
const setupTweaksHandlers = () => {
  electron.ipcMain.handle("tweak-states:load", async () => {
    try {
      await fs$1.access(tweaksStatePath);
      const data = await fs$1.readFile(tweaksStatePath, "utf8");
      return data;
    } catch (error) {
      if (error.code === "ENOENT") {
        return JSON.stringify({});
      }
      console.error("Error loading tweak states:", error);
      throw error;
    }
  });
  electron.ipcMain.handle(
    "tweak-states:save",
    async (_event, payload) => {
      try {
        await fs$1.mkdir(path.dirname(tweaksStatePath), { recursive: true });
        await fs$1.writeFile(tweaksStatePath, payload, "utf8");
        return true;
      } catch (error) {
        console.error("Error saving tweak states:", error);
        throw error;
      }
    }
  );
  electron.ipcMain.handle("tweaks:fetch", async () => {
    return await loadTweaks();
  });
  electron.ipcMain.handle("tweak:apply", async (_, name) => {
    const tweaks = await loadTweaks();
    const tweak = tweaks.find((t) => t.name === name);
    if (!tweak) {
      throw new Error(`No apply script found for tweak: ${name}`);
    }
    if (isGPUTweak(tweak) || isNvidiaTweak(tweak)) {
      const gpuInfo = await detectGPU();
      if (isGPUTweak(tweak) && !gpuInfo.hasGPU) {
        throw new Error(`This tweak requires a dedicated GPU, but no compatible GPU was detected.`);
      }
      if (isNvidiaTweak(tweak) && !gpuInfo.isNvidia) {
        throw new Error(`This tweak is only for NVIDIA GPUs, but no NVIDIA GPU was detected.`);
      }
    }
    if (name === "optimize-nvidia-settings") {
      console.log(logo, "Running Nvidia settings optimization...");
      return NvidiaProfileInspector().then((output) => ({ success: true, output: String(output) }));
    } else {
      return executePowerShell(null, { script: tweak.psapply, name, timeout: PS_LONG_TIMEOUT_MS });
    }
  });
  electron.ipcMain.handle("tweak:unapply", async (_, name) => {
    const tweaks = await loadTweaks();
    const tweak = tweaks.find((t) => t.name === name);
    if (!tweak || !tweak.psunapply) {
      throw new Error(`No unapply script found for tweak: ${name}`);
    }
    return executePowerShell(null, { script: tweak.psunapply, name, timeout: PS_LONG_TIMEOUT_MS });
  });
  electron.ipcMain.handle("nvidia-inspector", (_, _args) => {
    return NvidiaProfileInspector();
  });
  electron.ipcMain.handle("tweak:active", () => {
    return getActiveTweaks();
  });
  console.log("[CoreX main/tweakHandler.ts]: Tweak handlers setup complete");
};
const getActiveTweaks = () => {
  try {
    const data = fs.readFileSync(tweaksStatePath, "utf8");
    const parsed = JSON.parse(data);
    return Object.keys(parsed).filter((key) => parsed[key]);
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      console.error("Error loading tweak states:", error);
    }
    return [];
  }
};
console.log = log.log;
console.error = log.error;
console.warn = log.warn;
const DNS_CONFIGS = {
  cloudflare: { primary: "1.1.1.1", secondary: "1.0.0.1", name: "Cloudflare" },
  google: { primary: "8.8.8.8", secondary: "8.8.4.4", name: "Google" },
  opendns: { primary: "208.67.222.222", secondary: "208.67.220.220", name: "OpenDNS" },
  quad9: { primary: "9.9.9.9", secondary: "149.112.112.112", name: "Quad9" },
  adguard: { primary: "94.140.14.14", secondary: "94.140.15.15", name: "Adguard DN" },
  automatic: { primary: "", secondary: "", name: "Automatic (DHCP)" }
};
const getActiveAdapters = async () => {
  return new Promise((resolve) => {
    child_process.exec(
      `Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | ConvertTo-Json -Compress`,
      { shell: "powershell.exe", windowsHide: true, timeout: PS_TIMEOUT_MS, maxBuffer: PS_MAX_BUFFER },
      (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve([]);
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          const adapters = Array.isArray(parsed) ? parsed : [parsed];
          resolve(
            adapters.map((a) => ({
              name: a.Name,
              ifIndex: a.ifIndex
            }))
          );
        } catch {
          resolve([]);
        }
      }
    );
  });
};
const setDNSServers = async (ifIndex, dnsServers) => {
  return new Promise((resolve) => {
    const idx = Number(ifIndex);
    if (!Number.isInteger(idx) || idx <= 0) {
      resolve(false);
      return;
    }
    let cmd;
    if (dnsServers === null) {
      cmd = `Set-DnsClientServerAddress -InterfaceIndex ${idx} -ResetServerAddresses`;
    } else {
      const servers = dnsServers.map((s) => psQuote(String(s))).join(",");
      cmd = `Set-DnsClientServerAddress -InterfaceIndex ${idx} -ServerAddresses @(${servers})`;
    }
    child_process.exec(cmd, { shell: "powershell.exe", windowsHide: true, timeout: PS_TIMEOUT_MS, maxBuffer: PS_MAX_BUFFER }, (error) => {
      resolve(!error);
    });
  });
};
const flushDNS = async () => {
  return new Promise((resolve) => {
    child_process.exec("ipconfig /flushdns", { shell: "powershell.exe", windowsHide: true, timeout: PS_TIMEOUT_MS, maxBuffer: PS_MAX_BUFFER }, () => resolve());
  });
};
const setupDNSHandlers = () => {
  electron.ipcMain.handle("dns:get-current", async () => {
    try {
      const script = `
      Write-Host "Current DNS Settings:"
      
      Get-DnsClientServerAddress |
      Where-Object { $_.ServerAddresses.Count -gt 0 } |
      ForEach-Object {
          $adapter = Get-NetAdapter -InterfaceIndex $_.InterfaceIndex -ErrorAction SilentlyContinue
          if ($adapter) {
              $dnsList = $_.ServerAddresses | Where-Object { $_ -notmatch '^fec0' }
              if ($dnsList) {
                  Write-Host ("{0} | {1}" -f $adapter.Name, ($dnsList -join ', '))
              }
          }
      }
      `;
      const result = await executePowerShell(null, { script, name: "Get-DNS" });
      if (result.success) {
        const lines = result.output.trim().split("\n").filter((line) => line.includes("|"));
        const dnsInfo = lines.map((line) => {
          const [adapter, servers] = line.split("|");
          return { adapter: adapter.trim(), servers: servers.trim() };
        });
        return { success: true, data: dnsInfo };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(
    "dns:apply",
    async (_event, props) => {
      try {
        const { dnsType = "", primaryDNS = "", secondaryDNS = "" } = props || {};
        const normalizedType = String(dnsType).toLowerCase();
        if (normalizedType !== "custom" && !DNS_CONFIGS[normalizedType]) {
          return {
            success: false,
            error: "Invalid DNS type. Available options: cloudflare, google, opendns, quad9, adguard, automatic, custom"
          };
        }
        let config;
        if (normalizedType === "custom") {
          const primary = String(primaryDNS).trim();
          const secondary = String(secondaryDNS || "").trim();
          if (!primary) {
            return { success: false, error: "Primary DNS is required for custom DNS" };
          }
          if (!IPV4_RE.test(primary)) {
            return { success: false, error: `Invalid primary DNS address: ${primary}` };
          }
          if (secondary && !IPV4_RE.test(secondary)) {
            return { success: false, error: `Invalid secondary DNS address: ${secondary}` };
          }
          config = { primary, secondary, name: "Custom" };
        } else {
          config = DNS_CONFIGS[normalizedType];
        }
        const adapters = await getActiveAdapters();
        if (adapters.length === 0) {
          return { success: false, error: "No active network adapters found" };
        }
        const results = [];
        for (const adapter of adapters) {
          let dnsServers;
          if (normalizedType === "automatic" || !config.primary) {
            dnsServers = null;
          } else {
            dnsServers = [config.primary];
            if (config.secondary) dnsServers.push(config.secondary);
          }
          const success = await setDNSServers(adapter.ifIndex, dnsServers);
          if (success) {
            if (dnsServers === null) {
              results.push(`Set ${adapter.name} to automatic DNS (DHCP)`);
            } else {
              results.push(`Set ${adapter.name} to ${config.name} DNS: ${dnsServers.join(", ")}`);
            }
          } else {
            results.push(`Error configuring DNS for ${adapter.name}`);
          }
        }
        await flushDNS();
        return {
          success: true,
          output: results.join("\n") + "\nDNS configuration completed successfully!"
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );
  electron.ipcMain.handle("dns:reset", async () => {
    try {
      const adapters = await getActiveAdapters();
      if (adapters.length === 0) {
        return { success: false, error: "No active network adapters found" };
      }
      const results = [];
      for (const adapter of adapters) {
        const success = await setDNSServers(adapter.ifIndex, null);
        if (success) {
          results.push(`Reset ${adapter.name} to automatic DNS (DHCP)`);
        } else {
          results.push(`Error resetting DNS for ${adapter.name}`);
        }
      }
      await flushDNS();
      return {
        success: true,
        output: results.join("\n") + "\nDNS settings reverted to automatic successfully!"
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(
    "dns:test",
    async (_event, props) => {
      try {
        const hostname = (props && props.hostname ? String(props.hostname) : "google.com").trim();
        if (!HOSTNAME_RE.test(hostname)) {
          return { success: false, error: "Invalid hostname" };
        }
        const script = `
        try {
          $result = nslookup ${hostname} 2>&1
          Write-Host "DNS Test Results for ${hostname}:"
          Write-Host $result
        } catch {
          Write-Host "Error testing DNS: $($_.Exception.Message)"
        }
      `;
        const result = await executePowerShell(null, { script, name: "Test-DNS" });
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );
  electron.ipcMain.handle(
    "dns:ping-all",
    async () => {
      try {
        const dnsServers = [
          { name: "Cloudflare", server: "1.1.1.1" },
          { name: "Google", server: "8.8.8.8" },
          { name: "OpenDNS", server: "208.67.222.222" },
          { name: "Quad9", server: "9.9.9.9" },
          { name: "AdGuard DNS", server: "94.140.14.14" }
        ];
        const results = [];
        const pingServer = (server) => {
          return new Promise((resolve) => {
            child_process.exec(`ping -n 2 -w 1000 ${server}`, { shell: "cmd.exe", windowsHide: true, timeout: PS_TIMEOUT_MS }, (error, stdout) => {
              if (error) {
                resolve({ latency: null, status: "error" });
                return;
              }
              const match = stdout.match(/Average[^\d]*(\d+)ms/i) || stdout.match(/Average = (\d+)ms/i);
              if (match) {
                resolve({ latency: parseInt(match[1], 10), status: "success" });
              } else if (stdout.includes("TTL=") || stdout.includes("ttl=")) {
                resolve({ latency: null, status: "timeout" });
              } else {
                resolve({ latency: null, status: "timeout" });
              }
            });
          });
        };
        for (const dns of dnsServers) {
          const pingResult = await pingServer(dns.server);
          results.push({
            name: dns.name,
            server: dns.server,
            ...pingResult
          });
        }
        return { success: true, data: results };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );
  electron.ipcMain.handle("dns:get-adapters", async () => {
    try {
      const script = `
        Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | ForEach-Object {
          Write-Host "$($_.Name)|$($_.InterfaceDescription)|$($_.Status)"
        }
      `;
      const result = await executePowerShell(null, { script, name: "Get-Adapters" });
      if (result.success) {
        const lines = result.output.trim().split("\n").filter((line) => line.includes("|"));
        const adapters = lines.map((line) => {
          const [name, description, status] = line.split("|");
          return { name: name.trim(), description: description.trim(), status: status.trim() };
        });
        return { success: true, data: adapters };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("dns:flush-cache", async () => {
    try {
      const script = `
        Write-Host "Flushing DNS cache..."
        ipconfig /flushdns
        Write-Host "DNS cache flushed successfully!"
      `;
      const result = await executePowerShell(null, { script, name: "Flush-DNS" });
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  console.log("[CoreX main/dnsHandler.ts]: DNS handlers setup complete");
};
console.log = log.log;
console.error = log.error;
console.warn = log.warn;
function runPowerShell(cmd, options) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(String(cmd), "utf16le").toString("base64");
    child_process.exec(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}`,
      Object.assign({ windowsHide: true, timeout: PS_LONG_TIMEOUT_MS, maxBuffer: PS_MAX_BUFFER, killSignal: "SIGKILL" }, options || {}),
      (err, stdout, stderr) => {
        if (err) return reject(stderr || err.message);
        resolve(stdout);
      }
    );
  });
}
function changeRestorePointCooldown() {
  return runPowerShell(
    "New-ItemProperty -Path 'HKLM:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore' -Name 'SystemRestorePointCreationFrequency' -Value 0 -PropertyType DWord -Force"
  );
}
function getTimestamp() {
  const date = /* @__PURE__ */ new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}_${hh}-${mi}-${ss}`;
}
const setupBackupHandlers = () => {
  electron.ipcMain.handle("create-corex-restore-point", async () => {
    const label = `CoreXBackup-${getTimestamp()}`;
    try {
      await runPowerShell(`Checkpoint-Computer -Description ${psQuote(label)}`);
      await changeRestorePointCooldown();
      return { success: true, label };
    } catch (error) {
      console.error(error);
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(
    "create-restore-point",
    async (_event, name) => {
      try {
        const label = name ? `${name}-${getTimestamp()}` : `ManualRestore-${getTimestamp()}`;
        await runPowerShell(`Checkpoint-Computer -Description ${psQuote(label)}`);
        await changeRestorePointCooldown();
        return { success: true, label };
      } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
      }
    }
  );
  electron.ipcMain.handle(
    "delete-all-restore-points",
    async (_event, _sequenceNumber) => {
      try {
        await runPowerShell(`vssadmin delete shadows /all /quiet`);
        await changeRestorePointCooldown();
        return { success: true };
      } catch (error) {
        console.error("Error deleting all restore points:", error);
        return { success: false, error: error.message };
      }
    }
  );
  electron.ipcMain.handle("get-restore-points", async () => {
    try {
      const output = await runPowerShell(
        "Get-ComputerRestorePoint | Select-Object SequenceNumber, Description, CreationTime, EventType, RestorePointType | ConvertTo-Json"
      );
      await changeRestorePointCooldown();
      let points = [];
      try {
        points = JSON.parse(output);
        if (!Array.isArray(points)) points = [points];
      } catch {
        points = [];
      }
      return { success: true, points };
    } catch (error) {
      const message = String((error && error.message) || error);
      console.error(error);
      if (/access is denied|access denied|administrator|elevation/i.test(message)) {
        return {
          success: false,
          error: "System Restore queries require administrator privileges. Restart CoreX as administrator to view restore points."
        };
      }
      return { success: false, error: message };
    }
  });
  electron.ipcMain.handle(
    "restore-restore-point",
    async (_event, sequenceNumber) => {
      try {
        const restoreId = Number(sequenceNumber);
        if (!Number.isInteger(restoreId) || restoreId <= 0) {
          return { success: false, error: "Invalid restore point sequence number" };
        }
        await runPowerShell(`Restore-Computer -RestorePoint ${restoreId}`);
        await changeRestorePointCooldown();
        return { success: true };
      } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
      }
    }
  );
  electron.ipcMain.handle("delete-old-corex-backups", async () => {
    return new Promise((resolve, reject) => {
      const corexRoot = `C:\\CoreX`;
      if (!fs.existsSync(corexRoot)) {
        return resolve({ success: true, message: "CoreX folder does not exist" });
      }
      fs.rm(corexRoot, { recursive: true, force: true }, (err) => {
        if (err) return reject(err);
        resolve({ success: true, message: "CoreX folder deleted" });
      });
    });
  });
  console.log("[CoreX main/backup.ts]: Backup handlers setup complete");
};
electron.ipcMain.handle("tweak-backup:save", async (_event, payload) => {
  try {
    const backupDir = path.join(electron.app.getPath("userData"), "backups");
    ensureDirectoryExists(backupDir);
    const timestamp = getTimestamp();
    const backupPath = path.join(backupDir, `tweak-backup-${timestamp}.json`);
    await fs.promises.writeFile(backupPath, payload, "utf8");
    return { success: true, path: backupPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
electron.ipcMain.handle("tweak-backup:list", async () => {
  try {
    const backupDir = path.join(electron.app.getPath("userData"), "backups");
    if (!fs.existsSync(backupDir)) return { success: true, backups: [] };
    const files = await fs.promises.readdir(backupDir);
    const backups = files.filter((f) => f.startsWith("tweak-backup-") && f.endsWith(".json")).map((f) => ({
      name: f,
      path: path.join(backupDir, f),
      date: f.replace("tweak-backup-", "").replace(".json", "")
    })).sort((a, b) => b.date.localeCompare(a.date));
    return { success: true, backups };
  } catch (error) {
    return { success: false, error: error.message, backups: [] };
  }
});
electron.ipcMain.handle("tweak-backup:load", async (_event, backupPath) => {
  try {
    const data = await fs.promises.readFile(backupPath, "utf8");
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
electron.ipcMain.handle("tweak-backup:delete", async (_event, backupPath) => {
  try {
    await fs.promises.unlink(backupPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
let prevNetworkBytes = null;
let prevNetworkTimestamp = null;
async function getRealtimeNetworkStats() {
  try {
    const psScript = `
      $totalRx = [long]0
      $totalTx = [long]0
      Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
        $bytes = Get-NetAdapterStatistics -Name $_.Name -ErrorAction SilentlyContinue
        if ($bytes) {
          $totalRx += [long]$bytes.ReceivedBytes
          $totalTx += [long]$bytes.SentBytes
        }
      }
      Write-Output ("{0}|{1}" -f $totalRx, $totalTx)
    `;
    const result = await executePowerShell(null, { script: psScript, name: "Get-NetworkStats" });
    let totalRxBytes = 0;
    let totalTxBytes = 0;
    if (result.success && result.output) {
      const line = result.output.trim().split("\n").pop().trim();
      const parts = line.split("|");
      if (parts.length === 2) {
        totalRxBytes = parseInt(parts[0], 10) || 0;
        totalTxBytes = parseInt(parts[1], 10) || 0;
      }
    }
    const now = Date.now();
    let downloadMbps = 0;
    let uploadMbps = 0;
    if (prevNetworkBytes !== null && prevNetworkTimestamp !== null) {
      const elapsedSec = (now - prevNetworkTimestamp) / 1000;
      if (elapsedSec > 0.5) {
        const rxDelta = Math.max(0, totalRxBytes - prevNetworkBytes.rx);
        const txDelta = Math.max(0, totalTxBytes - prevNetworkBytes.tx);
        downloadMbps = parseFloat(((rxDelta * 8) / elapsedSec / 1e6).toFixed(1));
        uploadMbps = parseFloat(((txDelta * 8) / elapsedSec / 1e6).toFixed(1));
        prevNetworkBytes = { rx: totalRxBytes, tx: totalTxBytes };
        prevNetworkTimestamp = now;
      }
    } else {
      prevNetworkBytes = { rx: totalRxBytes, tx: totalTxBytes };
      prevNetworkTimestamp = now;
    }
    let latencyMs = null;
    try {
      const pingResult = await new Promise((resolve) => {
        child_process.exec("ping -n 1 -w 1000 8.8.8.8", { shell: "cmd.exe", windowsHide: true, timeout: PS_TIMEOUT_MS }, (error, stdout) => {
          if (error) {
            resolve(null);
            return;
          }
          const match = stdout.match(/time[=<](\d+)ms/i);
          resolve(match ? parseInt(match[1], 10) : null);
        });
      });
      latencyMs = pingResult;
    } catch {}
    return {
      success: true,
      downloadMbps,
      uploadMbps,
      latencyMs,
      totalRxBytes,
      totalTxBytes
    };
  } catch (error) {
    console.error("Failed to get network stats:", error);
    return { success: false, error: error.message, downloadMbps: 0, uploadMbps: 0, latencyMs: null };
  }
}
const setupNetworkStatsHandlers = () => {
  electron.ipcMain.handle("network:get-stats", getRealtimeNetworkStats);
  electron.ipcMain.handle("system:get-live-metrics", async () => {
    try {
      const cpuLoad = await si.currentLoad();
      const mem = await si.mem();
      const gpuInfo = await detectGPU();
      let gpuLoadPercent = 0;
      if (gpuInfo.isNvidia) {
        try {
          const { stdout } = await new Promise((resolve, reject) => {
            child_process.exec("nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits", { windowsHide: true, timeout: PS_TIMEOUT_MS }, (err, stdout, stderr) => {
              if (err) reject(err);
              else resolve({ stdout, stderr });
            });
          });
          gpuLoadPercent = parseInt(stdout.trim()) || 0;
        } catch {}
      }
      const memUsedGB = parseFloat((mem.used / 1073741824).toFixed(1));
      const memTotalGB = parseFloat((mem.total / 1073741824).toFixed(1));
      let _lmCpuTemp = null;
      let _lmGpuTemp = null;
      let _lmFanSpeed = null;
      try {
        const _lmTi = await si.cpuTemperature();
        if (_lmTi && _lmTi.main != null) _lmCpuTemp = _lmTi.main;
      } catch {}
      try {
        const _lmFanResult = await executePowerShell(null, { script: `Get-CimInstance -Namespace root\\wmi -ClassName Win32_Fan -ErrorAction SilentlyContinue | Select-Object -First 1 EstimatedRotationSpeed`, name: "GetFanSpeed" });
        const _lmFanOut = _lmFanResult.success ? _lmFanResult.output : "";
        const _lmFv = parseInt((_lmFanOut.stdout || "").trim(), 10);
        if (!isNaN(_lmFv) && _lmFv > 0) _lmFanSpeed = _lmFv;
      } catch {}
      return {
        success: true,
        cpuLoad: Math.round(cpuLoad.currentLoad || 0),
        ramUsedGB: memUsedGB,
        ramTotalGB: memTotalGB,
        ramPercent: Math.round((mem.used / mem.total) * 100),
        gpuLoad: gpuLoadPercent,
        cpuTemp: _lmCpuTemp,
        gpuTemp: _lmGpuTemp,
        fanSpeedRPM: _lmFanSpeed,
        gpuModel: gpuInfo.model,
        vram: gpuInfo.vram,
        hasGPU: gpuInfo.hasGPU
      };
    } catch (error) {
      console.error("Failed to get live metrics:", error);
      return { success: false, error: error.message };
    }
  });
  console.log("[CoreX main/networkStats.ts]: Network stats handlers setup complete");
};
const CHECK_INTERVAL = 5 * 60 * 1e3;
function initAutoUpdater(getMainWindow) {
  electronUpdater.autoUpdater.autoDownload = true;
  electronUpdater.autoUpdater.disableWebInstaller = false;
  electronUpdater.autoUpdater.autoInstallOnAppQuit = true;
  if (!electron.app.isPackaged) {
    electronUpdater.autoUpdater.forceDevUpdateConfig = true;
  }
  electronUpdater.autoUpdater.on("update-available", (info) => {
    const win = getMainWindow();
    win?.webContents.send("updater:available", {
      version: info.version,
      releaseNotes: info.releaseNotes ?? void 0
    });
  });
  electronUpdater.autoUpdater.on("update-not-available", () => {
    const win = getMainWindow();
    win?.webContents.send("updater:not-available", { currentVersion: electron.app.getVersion() });
  });
  electronUpdater.autoUpdater.on("error", (err) => {
    const win = getMainWindow();
    win?.webContents.send("updater:error", { message: String(err) });
  });
  electronUpdater.autoUpdater.on("download-progress", (progress) => {
    const win = getMainWindow();
    win?.webContents.send("updater:download-progress", {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    });
  });
  electronUpdater.autoUpdater.on("update-downloaded", (info) => {
    const win = getMainWindow();
    win?.webContents.send("updater:downloaded", { version: info.version });
  });
  electron.ipcMain.handle("updater:get-version", () => electron.app.getVersion());
  electron.ipcMain.handle("updater:check", async () => {
    // PATCHED: upstream repo Noveriks/CoreX no longer exists (404), so update
    // checks can never succeed. Report up-to-date instead of hitting the network.
    return { ok: true, updateInfo: null };
  });
  electron.ipcMain.handle("updater:download", async () => {
    try {
      await electronUpdater.autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("updater:install", () => {
    try {
      electronUpdater.autoUpdater.quitAndInstall(false, true);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  });
  if (electron.app.isPackaged) {
    setTimeout(() => triggerAutoUpdateCheck(), 3e3);
    setInterval(() => triggerAutoUpdateCheck(), CHECK_INTERVAL);
  }
}
async function triggerAutoUpdateCheck() {
  // PATCHED: upstream repo is gone; skip automatic background update checks.
  return;
}
async function getInstalledDrivers() {
  try {
    const psScript = `
      Get-WindowsDriver -Online -All -ErrorAction SilentlyContinue |
      Select-Object DriverName, OriginalFileName, Version, ProviderName, ClassName, Date |
      ConvertTo-Json -Depth 3
    `;
    const result = await executePowerShell(null, { script: psScript, name: "Get-Installed-Drivers" });
    if (result.success && result.output) {
      const output = result.output.trim();
      if (output === "" || output === "[]" || output.includes("requires elevation")) {
      } else {
        try {
          const parsed = JSON.parse(output);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {}
      }
    }
    log.warn("Get-WindowsDriver failed or requires elevation, falling back to pnputil");
    const pnputilScript = `
      $output = pnputil /enum-drivers 2>&1
      $drivers = @()
      $current = @{}
      foreach ($line in $output) {
        $line = $line.Trim()
        if ($line -match 'Published Name:\s+(.+)') {
          if ($current.ContainsKey('publishedname')) { $drivers += [PSCustomObject]$current }
          $current = @{ publishedname = $Matches[1].Trim() }
        }
        elseif ($line -match 'Original Name:\s+(.+)') { $current.originalfilename = $Matches[1].Trim() }
        elseif ($line -match 'Provider Name:\s+(.+)') { $current.providername = $Matches[1].Trim() }
        elseif ($line -match 'Class Name:\s+(.+)') { $current.classname = $Matches[1].Trim() }
        elseif ($line -match 'Class GUID:\s+(.+)') { $current.classguid = $Matches[1].Trim() }
        elseif ($line -match 'Driver Version:\s+(.+)') { $current.version = $Matches[1].Trim() }
        elseif ($line -match 'Signer Name:\s+(.+)') { $current.signername = $Matches[1].Trim() }
      }
      if ($current.ContainsKey('publishedname')) { $drivers += [PSCustomObject]$current }
      $drivers | ConvertTo-Json -Depth 3
    `;
    const pnputilResult = await executePowerShell(null, { script: pnputilScript, name: "Get-Installed-Drivers-PNPUTIL" });
    if (pnputilResult.success && pnputilResult.output) {
      const output = pnputilResult.output.trim();
      if (output === "" || output === "[]") {
        return [];
      }
      try {
        const parsed = JSON.parse(output);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {}
    }
    return [];
  } catch (error) {
    log.error("Failed to get installed drivers:", error);
    return [];
  }
}
async function checkForDriverUpdates() {
  const osInfo = await executePowerShell(null, {
    script: "[System.Environment]::OSVersion.Version",
    name: "Get-OS-Version"
  });
  if (!osInfo.success) {
    throw new Error("Failed to get OS version");
  }
  const version = osInfo.output.trim();
  if (!version.startsWith("10.0")) {
    throw new Error("Driver update feature is only available on Windows 10 and 11");
  }
  try {
    const psScript = `
      $session = New-Object -ComObject Microsoft.Update.Session
      $searcher = $session.CreateUpdateSearcher()
      $searcher.Online = $true
      $result = $searcher.Search("IsInstalled=0 and Type='Driver'")
      $updates = @()
      foreach ($update in $result.Updates) {
        $updates += [PSCustomObject]@{
          title = $update.Title
          description = $update.Description
          version = $update.Identity.UpdateID
          driverarticleid = $update.Identity.UpdateID
          kbarticleids = $update.KBArticleIDs
          isdownloaded = $update.IsDownloaded
          isinstalled = $update.IsInstalled
        }
      }
      $updates | ConvertTo-Json -Depth 3
    `;
    const result = await executePowerShell(null, { script: psScript, name: "Check-Driver-Updates" });
    if (result.success && result.output) {
      const output = result.output.trim();
      if (output === "" || output === "[]") {
        return [];
      }
      return JSON.parse(output);
    } else {
      throw new Error("Windows Update query failed: " + (result.error || "Unknown error"));
    }
  } catch (error) {
    log.error("Failed to check for driver updates:", error);
    throw error;
  }
}
async function installDriverUpdates(updateIds) {
  const requested = Array.isArray(updateIds) ? updateIds : [];
  if (requested.length === 0) {
    return { success: true, results: [] };
  }
  try {
    const results = [];
    for (const rawId of requested) {
      const id = String(rawId == null ? "" : rawId).trim();
      if (!UPDATE_ID_RE.test(id)) {
        results.push({ success: false, error: "Invalid update id", updateId: id });
        continue;
      }
      const psScript = `
        $session = New-Object -ComObject Microsoft.Update.Session
        $downloader = $session.CreateUpdateDownloader()
        $updateCollection = New-Object -ComObject Microsoft.Update.UpdateColl
        $update = $session.CreateUpdateSearcher().Search("UpdateID='$id'").Updates[0]
        if (-not $update) {
          [PSCustomObject]@{ Success = $false; Error = "Update not found: $id"; UpdateID = "$id" }
        } else {
          $downloader.Updates = $updateCollection
          $downloader.Updates.Add($update) | Out-Null
          $downloadResult = $downloader.Download()
          if ($downloadResult.ResultCode -eq 2) {
            $installer = $session.CreateUpdateInstaller()
            $installer.Updates = $updateCollection
            $installer.Updates.Add($update) | Out-Null
            $installResult = $installer.Install()
            [PSCustomObject]@{
              Success = $installResult.ResultCode -eq 2
              ResultCode = $installResult.ResultCode
              RebootRequired = $installer.RebootRequired
              Error = if ($installResult.ResultCode -ne 2) { $installResult.Error } else { $null }
              UpdateID = "$id"
              Title = $update.Title
            }
          } else {
            [PSCustomObject]@{
              Success = $false
              Error = "Download failed with code $($downloadResult.ResultCode)"
              UpdateID = "$id"
              Title = $update.Title
            }
          }
        }
      `;
      const finalScript = psScript.replace(/\$id/g, `'${id}'`);
      const result = await executePowerShell(null, { script: finalScript, name: "Install-Driver-Update", timeout: PS_LONG_TIMEOUT_MS });
      if (result.success && result.output) {
        try {
          const parsed = JSON.parse(result.output);
          results.push(parsed);
        } catch (e) {
          results.push({ success: false, error: result.output, updateId: id });
        }
      } else {
        results.push({ success: false, error: result.error || "Unknown error", updateId: id });
      }
    }
    const allSuccess = results.every((r) => r.success === true);
    return { success: allSuccess, results };
  } catch (error) {
    log.error("Failed to install driver updates:", error);
    throw error;
  }
}
const setupDriverUpdateHandlers = () => {
  electron.ipcMain.handle("driver-update:get-installed-drivers", getInstalledDrivers);
  electron.ipcMain.handle("driver-update:check-for-updates", checkForDriverUpdates);
  electron.ipcMain.handle("driver-update:install-updates", (_event, updateIds) => installDriverUpdates(updateIds));
  electron.ipcMain.handle("system:is-admin", async () => {
    try {
      const result = await executePowerShell(null, {
        script: "([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)",
        name: "Check-Admin"
      });
      if (result.success && result.output) {
        return { success: true, isAdmin: result.output.trim().toLowerCase() === "true" };
      }
      return { success: true, isAdmin: false };
    } catch {
      return { success: true, isAdmin: false };
    }
  });
  electron.ipcMain.handle("system:run-as-admin", async () => {
    try {
      const exePath = process.execPath;
      const passthroughArgs = process.argv.slice(1).map((arg) => psQuote(arg)).join(",");
      const script = `Start-Process -FilePath ${psQuote(exePath)} -ArgumentList @(${passthroughArgs}) -Verb RunAs`;
      const result = await executePowerShell(null, { script, name: "Run-As-Admin", timeout: 6e4 });
      if (!result.success) {
        return { success: false, error: result.error || "Elevation was cancelled or failed" };
      }
      setTimeout(() => electron.app.quit(), 500);
      return { success: true, restarting: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  log.info("[CoreX main/driverUpdateHandler.ts]: Driver update handlers setup complete");
};
console.log = log.log;
console.error = log.error;
console.warn = log.warn;
const logo = "[CoreX]:";
log.initialize();
const store = new Store();
let trayInstance = null;
if (store.get("showTray") === void 0) {
  store.set("showTray", false);
}
electron.ipcMain.handle("tray:get", () => {
  return store.get("showTray");
});
electron.ipcMain.handle("tray:set", (_event, value) => {
  store.set("showTray", value);
  if (exports.mainWindow) {
    if (value) {
      if (!trayInstance) {
        trayInstance = createTray(exports.mainWindow);
      }
    } else {
      if (trayInstance) {
        trayInstance.destroy();
        trayInstance = null;
      }
    }
  }
  return store.get("showTray");
});
const gotTheLock = electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", () => {
    if (exports.mainWindow) {
      if (exports.mainWindow.isMinimized()) exports.mainWindow.restore();
      exports.mainWindow.focus();
    }
  });
}
exports.mainWindow = null;
function createWindow() {
  console.log("[CoreX]: createWindow called");
  console.log("[CoreX]: __dirname =", __dirname);
  console.log("[CoreX]: icon path =", path.join(__dirname, "../../resources/corex.ico"));
  console.log("[CoreX]: preload path =", path.join(__dirname, "../preload/index.js"));
  console.log("[CoreX]: renderer path =", path.join(__dirname, "../renderer/index.html"));
  try {
    exports.mainWindow = new electron.BrowserWindow({
      width: 1380,
      backgroundColor: "#0c121f",
      height: 760,
      // minWidth: 1380,
      // minHeight: 760,
      minWidth: 790,
      center: true,
      frame: false,
      show: false,
      autoHideMenuBar: true,
      icon: getAppResource("corex.ico"),
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.js"),
        devTools: electron.app.isPackaged ? false : true,
        contextIsolation: true,
        nodeIntegration: false,
        webviewTag: false,
        sandbox: true,
        spellcheck: false
      }
    });
    console.log("[CoreX]: BrowserWindow created");
  } catch (err) {
    console.error("[CoreX]: BrowserWindow creation failed:", err);
    throw err;
  }
  exports.mainWindow.webContents.setWindowOpenHandler((details) => {
    const url = String(details.url || "");
    if (/^https?:\/\//i.test(url)) {
      electron.shell.openExternal(url).catch(() => {});
    }
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    console.log("[CoreX]: Loading renderer from URL:", process.env["ELECTRON_RENDERER_URL"]);
    exports.mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    console.log("[CoreX]: Loading renderer from file");
    exports.mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  exports.mainWindow.once("ready-to-show", () => {
    console.log("[CoreX]: Window ready to show");
    exports.mainWindow.show();
  });
  exports.mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription) => {
      console.error("[CoreX]: Renderer failed to load:", errorCode, errorDescription);
    }
  );
}
// PATCH: Chromium sandbox stays enabled (removing "no-sandbox" keeps the OS sandbox active).
// PATCH: removed "in-process-gpu" — caused black/blank window on some systems.
electron.app.whenReady().then(() => {
  console.log("[CoreX]: App ready, creating window...");
  try {
    createWindow();
    console.log("[CoreX]: Window created successfully");
  } catch (err) {
    console.error("[CoreX]: createWindow failed:", err);
  }
  initAutoUpdater(() => exports.mainWindow);
  console.log("[CoreX]: Auto updater initialized");
  if (store.get("showTray")) {
    console.log("[CoreX]: Creating tray...");
    try {
      trayInstance = createTray(exports.mainWindow);
      console.log("[CoreX]: Tray created");
    } catch (err) {
      console.error("[CoreX]: Tray creation failed:", err);
    }
  }
  setupPowerShellHandlers();
  setupSystemHandlers();
  setupTweaksHandlers();
  setupDNSHandlers();
  setupBackupHandlers();
  setupDriverUpdateHandlers();
  setupNetworkStatsHandlers();
  console.log("[CoreX]: Handlers setup complete");
  utils.electronApp.setAppUserModelId("com.noveriks.corex");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  electron.ipcMain.on("window-minimize", () => {
    if (exports.mainWindow) exports.mainWindow.minimize();
  });
  electron.ipcMain.on("window-toggle-maximize", () => {
    if (exports.mainWindow) {
      if (exports.mainWindow.isMaximized()) {
        exports.mainWindow.unmaximize();
      } else {
        exports.mainWindow.maximize();
      }
    }
  });
  electron.ipcMain.on("window-close", () => {
    if (exports.mainWindow) {
      if (store.get("showTray")) {
        exports.mainWindow.hide();
      } else {
        electron.app.quit();
      }
    }
  });
  electron.ipcMain.handle("open-devtools", () => {
    if (exports.mainWindow) {
      exports.mainWindow.webContents.openDevTools();
    }
  });
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((err) => {
  console.error("[CoreX]: app.whenReady failed:", err);
});
exports.logo = logo;
