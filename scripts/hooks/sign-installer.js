'use strict';

const path = require('path');
const { execFileSync } = require('child_process');

module.exports = async function signArtifacts(context) {
  const artifactPaths = (context && context.artifactPaths) || [];
  const targets = artifactPaths.filter((p) => p && /\.exe$/i.test(p));

  if (!process.env.SIGNPATH_API_TOKEN) {
    console.warn(
      '[signpath] SIGNPATH_API_TOKEN not set - installer will be published UNSIGNED'
    );
    return artifactPaths;
  }

  const ps1 = path.join(__dirname, '..', 'signpath-sign.ps1');

  for (const file of targets) {
    console.log(`[signpath] afterAllArtifactBuild: signing ${file}`);
    execFileSync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-InputPath', file],
      { stdio: 'inherit' }
    );
  }

  return artifactPaths;
};
