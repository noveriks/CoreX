# Privacy Policy — CoreX

**Last updated:** 30 September 2026
**App:** CoreX (Windows optimization utility)
**Developer:** Noveriks
**Contact:** help.mahinulislam@gmail.com
**Repository:** https://github.com/Noveriks/CoreX

CoreX is a local Windows optimization tool. This policy explains, in plain terms, what the app does with your data.

## 1. What we do NOT collect

- No names, email addresses, or account details — CoreX has no sign-up or login.
- No payment data — CoreX is free.
- No browsing history, file contents, or document metadata.
- No keystrokes, screenshots, or clipboard contents.
- No list of installed programs, personal files, or passwords.
- We never sell, rent, or share data with advertisers or data brokers.

## 2. Data processed on your device only

The following never leaves your PC unless a feature explicitly requires a network request:

- System information used for display and diagnostics (CPU, RAM, GPU, disk, temperatures, uptime).
- Windows tweaks, registry values, services, scheduled tasks, and DNS settings you choose to apply.
- Your app settings and preferences (stored locally via `electron-store`).
- Log files written locally to your app data folder for troubleshooting (`electron-log`).

## 3. Data that does leave your device

| Purpose | What is sent | Why |
|---|---|---|
| Anonymous usage analytics (PostHog) | App version, feature/screen events, OS version, coarse locale | Understand which features are used and fix crashes |
| Update checks (electron-updater) | App version + repository request | Check GitHub Releases for a newer version |
| Network diagnostics you trigger | Public IP address and DNS resolver addresses **only when you press the network/DNS test button** | Measure ping/latency and DNS response times |
| Crash and error logs | Error messages shown in the in-app log console | Diagnose failures you report to us |

No network diagnostic runs automatically — only after you start it.

## 4. PowerShell and system commands

To apply Windows tweaks, CoreX runs PowerShell scripts on your behalf (including scripts bundled in the `tweaks/` folder). These run **locally under your Windows account** and modify only what the tweak describes. Review any script before running it if you have concerns.

## 5. Third-party services

- **PostHog** — anonymous product analytics: https://posthog.com/privacy
- **GitHub** — release/update hosting: https://docs.github.com/en/site-policy/privacy-policies
- **Microsoft Windows** — normal OS APIs used by the app.

Each third party processes data under its own privacy policy.

## 6. Data retention

Analytics events are retained per the analytics provider's default retention settings. Local logs stay on your device until you delete them or uninstall the app. Uninstalling CoreX removes app settings when `deleteAppDataOnUninstall` is enabled in the installer.

## 7. Children

CoreX is not directed at children under 13, and we do not knowingly collect data from them.

## 8. Your rights

Depending on your region (GDPR, CCPA, etc.), you may have the right to access, delete, or export your data. Since CoreX collects no account data, most requests concern analytics events only. Email us at **help.mahinulislam@gmail.com** and we will act on them.

## 9. Changes

We may update this policy and will update the "Last updated" date above. Continued use after a change constitutes acceptance of the new policy.

## 10. Contact

Questions about privacy: **help.mahinulislam@gmail.com** or open an issue at https://github.com/Noveriks/CoreX/issues
