# CoreX — Code Signing & Release Guide

How CoreX is built, signed and published. Read this before making a release.

---

## 1. Why CoreX is digitally signed

A Windows installer that is not signed triggers **Microsoft Defender SmartScreen**
("Windows protected your PC") and shows **"Unknown publisher"** to every user,
because Windows cannot verify who produced the file. A valid Authenticode
signature:

* shows a real publisher identity in *Properties → Digital Signatures*,
* proves the binary has not been modified since it was signed,
* and lets SmartScreen build reputation for CoreX over time.

**A signature is not a malware guarantee.** It proves *who signed it* and that it
is *unmodified*, nothing more. Code signing and reputation are separate things:
SmartScreen warnings usually disappear only after the certificate is publicly
trusted **and** the file has a download/install history.

## 2. Who signs

Signing is done by **SignPath** (https://signpath.io). The private key never
leaves SignPath:

```
GitHub (tag) → GitHub Actions → build → unsigned installer
             → SignPath REST API → Authenticode signature
             → verification → GitHub Release
```

Nothing secret is stored in this repository:

* no `.pfx`, `.p12`, `.pem` or private key,
* no API token in `package.json`, workflow YAML, or any source file,
* the token is only read from `secrets.SIGNPATH_API_TOKEN` at runtime.

## 3. Local builds (developer machine)

`exe_maker.bat` builds and signs locally using the same SignPath policy:

| Env var | Meaning |
|---|---|
| `SIGNPATH_API_TOKEN` | SignPath API token (Windows user env var) |
| `SIGNPATH_ORG_ID` | SignPath organization id |
| `SIGNPATH_PROJECT` | SignPath project slug |
| `SIGNPATH_POLICY` | SignPath signing policy slug |
| `SIGNPATH_SIGN_APP` | `1` = also sign `CoreX.exe` (costs ~245 MB of yearly quota) |

Without `SIGNPATH_API_TOKEN` the build still works and produces an **unsigned**
installer — the build never fails just because signing is unavailable.

> **Quota note.** The SignPath Free Trial allows 1.2 GB of signed artifacts per
> year. The installer is ~119 MB and `CoreX.exe` is ~245 MB, so signing both on
> every build exhausts the quota quickly. The default is therefore
> **installer only**.

## 4. GitHub Actions workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `.github/workflows/ci.yml` | push/PR to `main`, manual | installs, builds the unsigned installer, verifies the Windows metadata, uploads an internal artifact. **No secrets, no signing.** |
| `.github/workflows/release.yml` | tag `v*`, manual | builds, uploads the artifact, submits it to SignPath, waits for the signature, verifies it, publishes the **signed** installer + `checksums.txt` to a GitHub Release. |

Security model: the signing secret is only referenced from `release.yml`, which
only runs on a tag push or a manual dispatch by someone with write access.
Pull requests — including from forks — can never trigger a production signature.

## 5. Required GitHub configuration (one-time)

### 5.1 Repository secret

1. Open GitHub → `Noveriks/CoreX`
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret**
   * Name: `SIGNPATH_API_TOKEN`
   * Secret: your SignPath API token
     (SignPath → your user name → *My profile* → *API Token* → *Generate token*)
4. **Add secret**

### 5.2 Repository variables

**Settings** → **Secrets and variables** → **Actions** → **Variables** tab →
**New repository variable** — create these four:

| Name | Value |
|---|---|
| `SIGNPATH_ORGANIZATION_ID` | `5f9cb404-0cb2-4705-af1b-8f8858a7a299` |
| `SIGNPATH_PROJECT_SLUG` | `CoreX_Development_Signing` |
| `SIGNPATH_SIGNING_POLICY_SLUG` | `CoreX_Development_Signing` |
| `SIGNPATH_ARTIFACT_CONFIGURATION_SLUG` | `initial` |

Optionally add `SIGNPATH_REQUIRE_VALID_SIGNATURE` = `true` once a **publicly
trusted** certificate is in use (it makes the workflow fail unless
`Get-AuthenticodeSignature` reports `Valid`).

## 6. Making a release

1. Update `version` in `package.json` (single source of truth).
2. Update the changelog / release notes.
3. Commit and push to `main`:
   ```powershell
   git add package.json
   git commit -m "release: 2.19.0"
   git push origin main
   ```
4. Create and push the tag (the tag **must** match the package.json version):
   ```powershell
   git tag v2.19.0
   git push origin v2.19.0
   ```
5. GitHub Actions runs `.github/workflows/release.yml` automatically.
6. When it finishes, the signed installer and `checksums.txt` are attached to
   the GitHub Release.

## 7. Verifying a download

```powershell
Get-AuthenticodeSignature ".\CoreX-Setup.exe" |
    Format-List Status, StatusMessage, SignerCertificate

Get-FileHash ".\CoreX-Setup.exe" -Algorithm SHA256
```

Expected: `SignerCertificate` subject `CN=CoreX, O=Noveriks, ...` and a
SHA-256 that matches the `checksums.txt` in the release.

In the Explorer: right click the file → **Properties** → **Digital Signatures**.

## 8. SmartScreen behaviour for a new application

Signing does **not** remove the SmartScreen warning immediately. Reputation is
earned over time from real downloads and installs. Until then users see
"Windows protected your PC" and must click **More info → Run anyway**, and the
"Unknown publisher" label remains until a **publicly trusted** certificate is
used.

To get a publicly trusted certificate the signing identity must be verified by
the certificate provider — a certificate issued to *Noveriks Team*. A certificate
provided by the SignPath Foundation identifies *SignPath Foundation*, not
Noveriks Team.

## 9. Reporting a suspicious CoreX release

Do not install a CoreX build that is not signed by `CN=CoreX, O=Noveriks`.
Report it to **help.mahinulislam@gmail.com** and open an issue at
https://github.com/Noveriks/CoreX/issues — include the file's SHA-256.
