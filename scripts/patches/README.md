# CoreX publisher branding — implementation notes

## Why this folder exists

CoreX's repository does **not** contain the application source code. The Electron app
lives only in the build output (`out/`, which is git-ignored):

```
out/main/index.js
out/preload/index.js
out/renderer/index.html
out/renderer/assets/index-Cnzw1PMS.js   <- the bundled React app
```

Because there is no `src/` and no bundler configuration in the repository, UI changes
have to be applied to the **built renderer bundle**. This folder keeps that change
reproducible and reviewable instead of an untraceable edit to a generated file.

## What `publisher-branding.patch.js` does

Run it against a pristine renderer bundle to produce the branded bundle:

```bash
node scripts/patches/publisher-branding.patch.js \
     out/renderer/assets/index-Cnzw1PMS.js \
     out/renderer/assets/index-Cnzw1PMS.js
```

Every replacement asserts that its anchor exists **exactly once** before writing, and
the script aborts if the hardcoded version string or the old `data$1` reference is still
present afterwards. It is idempotent-safe in the sense that it fails loudly rather than
double-patching.

Changes applied by the patch:

| # | Change | Reason |
|---|--------|--------|
| R1 | Adds `useAppVersionStore` (zustand) + `PUBLISHER_NAME` + `PUBLISHER_DESCRIPTION` + `PublisherBranding` component; loads the version from the main process via the existing `updater:get-version` IPC channel | Removes the hardcoded `const version = "2.19.0"` — the version now comes from `electron.app.getVersion()`, the single authoritative source |
| R2–R4 | `CURRENT_VERSION` constant removed; the Tweaks page reads the version from the store | Keeps the "New in CoreX X.Y" / "Updated in CoreX X.Y" comparisons working with the authoritative version |
| R5–R6 | Sidebar footer and first-run modal read the version from the store | Same |
| R7 | Extends the existing **Settings → About** card with the publisher block and metadata | Adds publisher information without creating a second About section |
| R8 | Adds the compact publisher line to the dashboard header (under the greeting) | Dashboard branding |

## Important

If the application source is ever added to the repository, the branding must be moved
into real React components and this patch must be retired. The `PublisherBranding`
component shape (`variant="compact" | "expanded"`) was chosen to map directly onto such
a component.
