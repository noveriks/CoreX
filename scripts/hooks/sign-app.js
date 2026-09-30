'use strict';

const path = require('path');
const { execFileSync } = require('child_process');

module.exports = async function signApp(context) {
  const { appOutDir, electronPlatformName } = context;

  if (electronPlatformName && electronPlatformName !== 'win32') return;

  if (!process.env.SIGNPATH_API_TOKEN) {
    console.warn(
      '[signpath] SIGNPATH_API_TOKEN not set - building UNSIGNED (CoreX.exe will not be signed)'
    );
    return;
  }

  const exe = path.join(appOutDir, 'CoreX.exe');
  const ps1 = path.join(__dirname, '..', 'signpath-sign.ps1');

  console.log(`[signpath] afterSign: signing ${exe}`);
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-InputPath', exe],
    { stdio: 'inherit' }
  );
};
