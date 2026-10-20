'use strict';

// Applies the Windows version-information (VS_VERSIONINFO) fields to an
// executable.
//
// electron-builder writes FileDescription / ProductName / LegalCopyright /
// CompanyName itself (see app-builder-lib/out/winPackager.js -> signAndEditResources),
// but it hardcodes two of them:
//   * FileDescription  -> always appInfo.productName
//   * OriginalFilename -> always "" (empty)
// so they cannot be configured through electron-builder's schema.
//
// This runs from the `afterSign` hook, i.e. AFTER electron-builder applied its
// own resources and BEFORE the file is signed, so the Authenticode signature
// always covers the final metadata.

const fs = require('fs');
const path = require('path');
const resedit = require('resedit');

const pkg = require(path.join(__dirname, '..', '..', 'package.json'));

const buildConfig = pkg.build || {};
const winConfig = buildConfig.win || {};

const productName = buildConfig.productName || pkg.productName || pkg.name;
const executableName = winConfig.executableName || productName;
const companyName = (pkg.author && pkg.author.name) || 'Noveriks Team';
const copyright = buildConfig.copyright || `Copyright © ${companyName}`;

// Not part of the electron-builder schema - keep it here.
const FILE_DESCRIPTION = 'CoreX Windows System Utility';

function buildVersionStrings() {
  return {
    CompanyName: companyName,
    ProductName: productName,
    FileDescription: FILE_DESCRIPTION,
    LegalCopyright: copyright,
    InternalName: executableName,
    OriginalFilename: `${executableName}.exe`,
  };
}

function applyVersionInfo(exePath) {
  const buffer = fs.readFileSync(exePath);
  const executable = resedit.NtExecutable.from(buffer);
  const res = resedit.NtExecutableResource.from(executable);

  const viList = resedit.Resource.VersionInfo.fromEntries(res.entries);
  const vi = viList.length > 0 ? viList[0] : resedit.Resource.VersionInfo.createEmpty();

  const languages = vi.getAllLanguagesForStringValues();
  const lang = languages.length > 0 ? languages[0] : { lang: 0x0409, codepage: 1200 };

  const versionStrings = buildVersionStrings();
  vi.setStringValues(lang, versionStrings);
  vi.outputToResourceEntries(res.entries);

  res.outputResource(executable);
  fs.writeFileSync(exePath, Buffer.from(executable.generate()));

  return versionStrings;
}

module.exports = { applyVersionInfo, buildVersionStrings };

if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error('usage: node version-info.js <path-to-exe>');
    process.exit(1);
  }
  console.log('[version-info]', JSON.stringify(applyVersionInfo(target), null, 2));
}
