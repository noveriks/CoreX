'use strict';

const path = require('path');
const { execFileSync } = require('child_process');
const { applyVersionInfo } = require('./version-info');

module.exports = async function signApp(context) {
  const { appOutDir, electronPlatformName } = context;

  if (electronPlatformName && electronPlatformName !== 'win32') return;

  const exe = path.join(appOutDir, 'CoreX.exe');

  // Windows version information must be final BEFORE the file is signed,
  // otherwise the Authenticode signature would not cover it.
  const versionStrings = applyVersionInfo(exe);
  console.log(`[version-info] ${exe}`);
  for (const [key, value] of Object.entries(versionStrings)) {
    console.log(`[version-info]   ${key} = ${value}`);
  }

  if (!process.env.SIGNPATH_API_TOKEN) {
    console.warn(
      '[signpath] SIGNPATH_API_TOKEN not set - building UNSIGNED (CoreX.exe will not be signed)'
    );
    return;
  }

  // The application executable is ~245 MB, the installer ~125 MB. Signing both
  // on every build consumes 2x the SignPath yearly artifact-size quota
  // (1.2 GB on the Free Trial plan), so signing the app executable is opt-in
  // via SIGNPATH_SIGN_APP=1. The installer is always the signed release
  // artifact.
  if (process.env.SIGNPATH_SIGN_APP !== '1') {
    console.log(
      '[signpath] skipping CoreX.exe signing (set SIGNPATH_SIGN_APP=1 to sign it as well)'
    );
    return;
  }

  const ps1 = path.join(__dirname, '..', 'signpath-sign.ps1');

  console.log(`[signpath] afterSign: signing ${exe}`);
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-InputPath', exe],
    { stdio: 'inherit' }
  );
};
