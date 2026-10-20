// CoreX publisher branding patch for the built renderer bundle (formatted output).
// Every replacement asserts a unique anchor before writing.
const fs = require('fs');

const BUNDLE = process.argv[2];
const OUT = process.argv[3];

let src = fs.readFileSync(BUNDLE, 'utf8');
const origLen = src.length;
const changes = [];

function rx(pattern, replacement, label, flags = '') {
  const re = new RegExp(pattern, flags);
  const matches = src.match(re);
  if (!matches) throw new Error(`ANCHOR NOT FOUND: ${label}`);
  if (matches.length > 1) throw new Error(`ANCHOR NOT UNIQUE (${matches.length}): ${label}`);
  src = src.replace(re, replacement);
  changes.push(label);
}

// -------------------------------------------------- R1: version store + publisher identity
rx(
  'const version = "2\\.19\\.0";\\s*const data\\$1 = \\{\\s*version\\s*\\};',
  [
    'const useAppVersionStore = create((set) => ({ version: "", setVersion: (version) => set({ version }) }));',
    'const PUBLISHER_NAME = "Noveriks Team";',
    'const PUBLISHER_DESCRIPTION = "Windows system monitoring and optimization toolkit";',
    'const PublisherBranding = ({ variant = "compact" }) => {',
    '  if (variant === "expanded") {',
    '    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3", children: [',
    '      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-bold uppercase tracking-widest text-fylo-text-secondary", children: "Published by" }),',
    '      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold text-fylo-text tracking-tight mt-0.5", children: PUBLISHER_NAME })',
    '    ] });',
    '  }',
    '  return /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] font-medium tracking-wide text-fylo-text-secondary select-none", children: [',
    '    "Published by ",',
    '    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-fylo-primary font-semibold", children: PUBLISHER_NAME })',
    '  ] });',
    '};',
    'queueMicrotask(() => {',
    '  invoke({ channel: "updater:get-version" }).then((v) => {',
    '    if (v) useAppVersionStore.getState().setVersion(String(v));',
    '  }).catch(() => {});',
    '});'
  ].join('\r\n'),
  'R1 authoritative version store + publisher constants + PublisherBranding'
);

// -------------------------------------------------- R2: drop hardcoded CURRENT_VERSION
rx('const CURRENT_VERSION = version;\\s*', '', 'R2 remove hardcoded CURRENT_VERSION');

// -------------------------------------------------- R3: Tweaks reads the version from the store
rx(
  'function Tweaks\\(\\) \\{\\s*const \\[tweaks, setTweaks\\]',
  'function Tweaks() {\r\n  const currentVersion = useAppVersionStore((s) => s.version);\r\n  const [tweaks, setTweaks]',
  'R3 Tweaks uses store version'
);

// -------------------------------------------------- R4: tweak version comparisons
rx(
  'isNewInCurrentVersion\\(tweak\\.addedversion, CURRENT_VERSION\\)',
  'isNewInCurrentVersion(tweak.addedversion, currentVersion)',
  'R4a tweak "new in" comparison'
);
rx(
  'isUpdatedInCurrentVersion\\(\\s*tweak\\.updatedversion,\\s*CURRENT_VERSION\\s*\\)',
  'isUpdatedInCurrentVersion(tweak.updatedversion, currentVersion)',
  'R4b tweak "updated in" comparison'
);

// -------------------------------------------------- R5: sidebar version
rx(
  'children: \\[\\s*"v",\\s*data\\$1\\.version\\s*\\]',
  'children: [\r\n            "v",\r\n            useAppVersionStore((s) => s.version)\r\n          ]',
  'R5 sidebar version from store'
);

// -------------------------------------------------- R6: welcome modal version
rx(
  'children: \\[\\s*"CoreX Version: ",\\s*data\\$1\\?\\.version\\s*\\]',
  'children: [\r\n      "CoreX Version: ",\r\n      useAppVersionStore((s) => s.version)\r\n    ]',
  'R6 welcome modal version from store'
);

// -------------------------------------------------- R7: About section
{
  const startAnchor = 'jsx(SettingSection, { title: "About"';
  const endAnchor = '/* @__PURE__ */ jsxRuntimeExports.jsxs(SettingSection, { title: "Developer Options"';
  const c = (a) => src.split(a).length - 1;
  if (c(startAnchor) !== 1) throw new Error(`About start anchor count ${c(startAnchor)}`);
  if (c(endAnchor) !== 1) throw new Error(`About end anchor count ${c(endAnchor)}`);
  const start = src.indexOf(startAnchor);
  const end = src.indexOf(endAnchor, start);
  if (end < start) throw new Error('About bounds invalid');

  const about = [
    'jsx(SettingSection, { title: "About", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SettingCard, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-4", children: [',
    '        /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: logo, alt: "CoreX", className: "w-12 h-12 rounded-xl drop-shadow-lg shrink-0" }),',
    '        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [',
    '          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-bold text-fylo-text tracking-tight", children: "CoreX" }),',
    '          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-fylo-text-secondary mt-0.5", children: PUBLISHER_DESCRIPTION }),',
    '          /* @__PURE__ */ jsxRuntimeExports.jsx(PublisherBranding, { variant: "expanded" }),',
    '          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 pt-3 border-t border-fylo-border/30 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-fylo-text-secondary", children: [',
    '            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex flex-wrap items-center gap-1.5", children: ["Version: ", /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-fylo-text", children: useAppVersionStore((s) => s.version) })] }),',
    '            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex flex-wrap items-center gap-1.5", children: ["License: ", /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-fylo-text", children: "MIT" })] }),',
    '            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex flex-wrap items-center gap-1.5", children: ["Website: ", /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "https://getcorex.net", target: "_blank", className: "text-fylo-primary hover:underline font-semibold", children: "getcorex.net" })] }),',
    '            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex flex-wrap items-center gap-1.5", children: ["Source: ", /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "https://github.com/Noveriks/CoreX", target: "_blank", className: "text-fylo-primary hover:underline font-semibold", children: "github.com/Noveriks/CoreX" })] }),',
    '            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex flex-wrap items-center gap-1.5", children: ["Support: ", /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-fylo-text", children: "help.mahinulislam@gmail.com" })] })',
    '          ] })',
    '        ] })',
    '      ] })',
    '    })',
    '  }), ',
  ].join('\r\n');

  src = src.slice(0, start) + about + src.slice(end);
  changes.push('R7 About section extended with publisher info');
}

// -------------------------------------------------- R8: dashboard header
{
  const startAnchor = 'className: "flex items-center gap-4 mb-6 select-none"';
  const endAnchor = '}\r\nfunction CircularGauge(';
  const c = (a) => src.split(a).length - 1;
  if (c(startAnchor) !== 1) throw new Error(`header start anchor count ${c(startAnchor)}`);
  if (c(endAnchor) !== 1) throw new Error(`header end anchor count ${c(endAnchor)}`);
  const start = src.indexOf(startAnchor);
  const end = src.indexOf(endAnchor, start);
  if (end < start) throw new Error('header bounds invalid');

  const region = src.slice(start, end);
  const iconStart = region.indexOf('jsxRuntimeExports.jsx("div", { className: "p-2.5');
  const h1Start = region.indexOf('jsxRuntimeExports.jsxs("h1"');
  if (iconStart === -1 || h1Start === -1 || h1Start < iconStart) throw new Error('header inner blocks not found');
  const iconText = region.slice(iconStart, h1Start).replace(/,\s*$/, '').trim();
  const h1End = region.indexOf('] })', h1Start);
  if (h1End === -1) throw new Error('h1 end not found');
  const h1Text = region.slice(h1Start, h1End + 4).trim();

  const header = [
    'className: "flex items-start gap-4 mb-6 select-none", children: [',
    '    ' + iconText + ',',
    '    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [',
    '      ' + h1Text + ',',
    '      /* @__PURE__ */ jsxRuntimeExports.jsx(PublisherBranding, { variant: "compact" })',
    '    ] })',
    '  ] })'
  ].join('\r\n');

  src = src.slice(0, start) + header + src.slice(end);
  changes.push('R8 dashboard header compact publisher attribution');
}

// -------------------------------------------------- verify
if (src.includes('data$1')) throw new Error('data$1 still referenced');
if (src.includes('"2.19.0"')) throw new Error('hardcoded version still present');
if (!src.includes('Noveriks Team')) throw new Error('publisher name missing');
if (!src.includes('useAppVersionStore')) throw new Error('version store missing');

fs.writeFileSync(OUT, src);
console.log('patched ->', OUT);
console.log('size', origLen, '->', src.length);
for (const c of changes) console.log('  +', c);
