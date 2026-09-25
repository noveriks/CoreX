# CoreX

**A powerful Windows system monitor & optimization toolkit built by Noveriks.**

Monitor real-time CPU, RAM, GPU, network, and temperature stats. Apply 81+ precision debloat tweaks. Clean junk files. Manage apps. Customize your Windows experience — all in one elegant desktop app.

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows_10%2F11-blue?style=for-the-badge" alt="Platform"/>
  <img src="https://img.shields.io/badge/Electron-44.0.0-4784FF?style=for-the-badge&logo=electron" alt="Electron"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React"/>
  <img src="https://img.shields.io/github/v/release/Noveriks/CoreX?style=for-the-badge" alt="Release"/>
  <img src="https://img.shields.io/github/license/Noveriks/CoreX?style=for-the-badge&color=blue" alt="License"/>
</p>

---

## Features

### Dashboard — Real-Time System Overview
- **CPU Monitor**: Live load percentage with animated circular gauge
- **RAM Monitor**: Used vs total memory with real-time bar
- **GPU Monitor**: GPU load percentage (NVIDIA via nvidia-smi, AMD integrated via registry/WMI)
- **Network Activity**: Real-time download/upload speed with wave visualization charts
- **Temperature**: CPU & GPU temperature with color-coded warnings (green <70°C, yellow <80°C, red ≥80°C)
- **System Runtime**: Uptime displayed in days, hours, minutes
- **Storage Health**: Per-drive health score, media type, SMART status, and wear level for SSDs
- **System Status Overview**: Optimization score, active process count, disk free space

### Tweaks — 81 Windows Optimizations
Apply or revert carefully crafted registry tweaks. Each tweak has a `.meta.json` description and reversible apply/unapply scripts.

| Category | Tweaks |
|----------|--------|
| **Privacy & Telemetry** | Block telemetry hosts, disable diagnostic data, disable activity history, disable advertising ID, disable app spying, disable location tracking, disable consumer features |
| **Performance** | Optimize network settings, disable power throttling, disable core parking, enable high performance power plan, enable MSI mode GPU, disable memory compression, disable superfetch/SysMain, set Win32 priority separation |
| **Visual & UX** | Disable animations, disable visual effects, disable window animations, enable dark mode, 24-hour clock, hide taskview and widgets, show file extensions, show seconds in system clock, align taskbar left |
| **Bloat Removal** | Remove Cortana, remove Clipchamp, remove gaming apps (Xbox/Game Bar), remove MS Bing integration, remove OneDrive, remove Teams, disable Copilot, disable Recall |
| **System Services** | Set services to manual, disable search indexing, disable diagnostic data, detailed BSOD, block Windows tips suggestions |
| **Security & Control** | Enable crash dumps, enable end-task right-click, disable RDP warnings, disable fullscreen optimizations |
| **File System** | Disable 8.3 shortcut names, disable NTFS last access time, optimize SSD TRIM |
| **Power & Hardware** | Disable hibernation, disable HPET, disable USB power savings, disable fast startup, disable sleep study |
| **Network** | Disable IPv6, disable Nagle's algorithm, disable network throttling, disable WiFi Sense |
| **Gaming** | Enable game mode, disable Game Bar, enable optimization for windowed games |
| **Menu & Navigation** | Menu show delay zero, classic file explorer, revert context menu, hide task view |
| **Developer** | Set PowerShell 7 as default, enable HAGS (Hardware-Accelerated GPU Scheduling) |

### Cleaner — Junk File Removal
Quickly clear common system cache locations:
- `C:\Windows\Temp`
- `C:\Windows\Prefetch`
- Recycle Bin
- Windows Update download cache
- Explorer thumbnail cache
- Crash dumps
- And more...

### DNS Manager
- View and change DNS server addresses
- Flush DNS cache
- Get current adapter DNS configuration
- Reset to system defaults
- Requires internet connection

### Apps — Software Installer
Install popular applications directly from the app store using **Winget** or **Chocolatey**:
- **Browsers**: Firefox, Chrome, Edge
- **Communication**: Discord, Zoom, Telegram
- **Media**: Spotify, VLC
- **Development**: VS Code, Git, Node.js
- **And more...**

Chocolatey is auto-detected and installed if missing.

### Restore — Backup & Restore Points
- Create Windows system restore points before applying tweaks
- View existing restore points
- Restore to a previous point
- Clean up old backups to free disk space

### Settings
- **Theme**: 9 built-in themes — System, Dark, Obsidian, Cyberpunk, Midnight, Light, Purple, Gray, Classic
- **Tray Icon**: Show/hide system tray icon
- **Auto-Start**: Launch on Windows login
- **Cache**: Clear application cache
- **Logs**: Open log folder for troubleshooting

### Driver Updates
- Detect NVIDIA graphics drivers
- Launch NVIDIA Profile Inspector for advanced GPU settings

---

## Screenshots

![Dashboard](https://via.placeholder.com/1200x675/0d1117/58a6ff?text=CoreX+Dashboard)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Electron](https://www.electronjs.org/) 44.x |
| UI Framework | [React](https://react.dev/) 19.x |
| State Management | [Zustand](https://zustand.demo.immer.io/) 5.x |
| Styling | [Tailwind CSS](https://tailwindcss.com/) + CSS custom properties (themes) |
| System Data | [systeminformation](https://github.com/sebpiq/systeminformation) 5.x |
| Logging | [electron-log](https://github.com/megahertz/electron-log) 5.x |
| Persistence | [electron-store](https://github.com/sindresorhus/electron-store) 8.x |
| Auto-Update | [electron-updater](https://www.electron.build/auto-update) 6.x |
| Icons | [Lucide](https://lucide.dev/) |
| Toasts | [react-toastify](https://fkhadra.github.io/react-toastify/) 11.x |
| Router | [react-router-dom](https://reactrouter.com/) 7.x |
| Analytics | [PostHog](https://posthog.com/) |

---

## Architecture

```
out/
├── main/          # Electron main process (IPC handlers, system ops, PowerShell)
│   └── index.js   # All IPC channels, tweak engine, backup system
├── renderer/      # React SPA bundle
│   ├── index.html # Entry point
│   └── assets/
│       ├── index-*.js   # Minified React bundle (~1.1 MB)
│       └── index-*.css  # Tailwind + theme CSS
└── preload/       # Context bridge exposing electron API to renderer
    └── index.js
tweaks/            # 81 tweak configs (registry.json, meta.json, apply/unapply scripts)
bucket/            # Chocolatey bucket definition for distribution
resources/         # App icon and bundled tools (NVIDIA Profile Inspector)
```

### IPC Channels

The app communicates via Electron's `ipcMain.handle` / `ipcRenderer.invoke` pattern:

**System Info**: `get-system-info` — CPU model, cores, threads, GPU, RAM, disk, uptime, temperature, fan speed, SSD health
**Live Metrics**: `system:get-live-metrics` — Real-time CPU load, RAM usage, GPU load, CPU/GPU temp, fan RPM (5s interval)
**Network**: `network:get-stats` — Download/upload Mbps, latency (3s interval)
**Tweaks**: `tweaks:fetch`, `tweak:apply`, `tweak:unapply`, `tweak:active`, `tweak-states:load`
**Backup**: `create-corex-restore-point`, `get-restore-points`, `delete-old-corex-backups`
**DNS**: `dns:get-current`, `dns:get-adapters`, `dns:set-dns`, `dns:flush-cache`, `dns:reset`
**Apps**: `handle-apps` (install/check/remove), `check-winget`, `check-chocolatey`, `install-chocolatey`
**Cleanup**: `clear-corex-cache`, `optimize-memory`, `restart-explorer`
**System**: `restart`, `open-log-folder`, `get-user-name`
**Startup**: `startup:get-items`, `startup:toggle-item`
**NVIDIA**: `nvidia-inspector`

---

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/Noveriks/CoreX.git
cd CoreX

# Install dependencies (pnpm recommended)
pnpm install

# Run in development mode
pnpm start

# Build for production
pnpm build
```

### Binary Release

Download the latest `.exe` installer from the [Releases](https://github.com/Noveriks/CoreX/releases) page.

### Chocolatey

```powershell
choco install corex
```

---

## Requirements

- **OS**: Windows 10 (21H2+) or Windows 11
- **Architecture**: x64
- **RAM**: 4 GB minimum
- **Disk**: 200 MB free
- **PowerShell**: 5.1 or PowerShell 7.x

---

## License

**MIT License** — This project is free and open-source software.

You are free to use, study, modify, and distribute this software under the terms of the MIT License. See [LICENSE](LICENSE) for the full text.

---

## Credits

Built with ❤️ by **Noveriks**

- [Electron](https://www.electronjs.org/) — Cross-platform desktop framework
- [React](https://react.dev/) — UI library
- [systeminformation](https://github.com/sebpiq/systeminformation) — Hardware monitoring
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS

---

## Support

- **GitHub Issues**: [Noveriks/CoreX/issues](https://github.com/Noveriks/CoreX/issues)
- **Log Location**: `%APPDATA%\CoreX\logs\`
- **Config Location**: `%APPDATA%\Electron\config.json`
