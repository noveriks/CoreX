# Fylo Core Glassmorphism UI Overhaul (Desktop App Specification)

This specification details the transition of Fylo Core from a flat layout to a premium glassmorphic UI, tailored specifically to desktop application conventions (following Fluent Design principles) rather than web page interfaces.

## Current State
- Flat card design with basic borders ([Card.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/ui/Card.tsx))
- Basic color theme system with 5 themes in [App.css](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/App.css)
- Plain non-standard sidebar nav, titlebar, buttons, and modals
- Standard browser-style scrolling, custom fonts, and web hover lifts

## Design Language (Desktop Conventions)
- **Glass Effect (Acrylic/Mica)**: Restyled to replicate Windows 11 Acrylic materials. Backdrops combine a `backdrop-blur-md` saturation boost with translucent base shades (`rgba(..., 0.45)`).
- **Active vs. Inactive Window States**: Visual glass elements adapt dynamically when the application window loses focus. Text and border opacity decrease, and card backdrops become more opaque or solid to prevent distraction.
- **Segoe UI Typography**: Replaced web-centric fonts (Poppins) with the native Windows system font family: `"Segoe UI Variable", "Segoe UI", system-ui, sans-serif`.
- **Specular Highlights (Borders)**: Replaced thick colored borders with a thin `1px` high-contrast outline border at the top and left, and low-contrast borders at the bottom and right to simulate light falling on glass edges.
- **Snappy Desktop Motion**: Removed floating card lifts, elastic bouncy movements, and long spin-loops. Replaced them with snappy Fluent-like transitions (`150ms-200ms`, standard bezier curves).
- **Desktop Windowing**: Native layout constraints with keyboard-accessible elements, tab navigation, and standard desktop scrollbars.

---

## Task 1: Theme System and CSS Foundation
**File**: [App.css](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/App.css)
- Overhaul the 5 color palettes with active and inactive variables (e.g., `--color-card-active` and `--color-card-inactive`).
- Replace Poppins imports with the native system font stack.
- Style scrollbars to match the modern Windows 11 overlay scrollbars: thin (6px), completely hidden/transparent when inactive, and visible with a rounded gray handle only on hover.
- Add utility selectors for `.glass-card`, `.glass-sidebar`, and `.glass-titlebar` designed to adapt when the `.window-inactive` class is applied to the root body.
- Configure keyboard navigation states with standard focus outlines (`:focus-visible`).

## Task 2: Core Layout Shell
**Files**: [App.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/App.tsx), [rootdiv.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/rootdiv.tsx)
- **App.tsx**: Add window event listeners (`focus` and `blur`) to dynamically add or remove the `window-inactive` class on `document.body`. This updates all glass components in real-time when switching active programs.
- **RootDiv.tsx**: Implement snappy cross-fade page transition sequences (200ms opacity fades) rather than slide animations.

## Task 3: TitleBar Redesign
**File**: [titlebar.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/titlebar.tsx)
- Restyle minimize, maximize/restore, and close buttons to strictly match Windows 11 guidelines:
  - Width: `46px`, Height: matches titlebar height.
  - Hover: Close button transitions to red (`bg-red-600` / `#e81123`), others transition to standard gray overlays.
- Double-check drag region regions (`-webkit-app-region: drag`) and ensure interactive controls (like the Settings badge or window buttons) are marked as `no-drag`.
- Align title and application icon to the left, matching native Windows utility apps.

## Task 4: Navigation Sidebar Redesign
**File**: [nav.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/nav.tsx)
- Redesign the sidebar as a docked panel rather than a floating panel, matching standard desktop system navigation menus.
- Restyle the active state with a left-aligned vertical indicator pill combined with a subtle background highlight (no large floating boxes).
- Move the settings tab and refresh badges to a pinned footer at the bottom of the sidebar, separated by a subtle 1px divider.

## Task 5: UI Components - Card and Button
**Files**: [Card.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/ui/Card.tsx), [button.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/ui/button.tsx)
- **Card**: Remove hover lifts/translations. Use subtle background opacity transitions (`bg-opacity` shifting on hover) and border-color highlights.
- **Button**: Adapt click states to feel native (e.g., scale compression `active:scale-[0.98]` and border highlights). Ensure `:focus-visible` displays clear accent rings.

## Task 6: UI Components - Toggle, Modal, Input
**Files**: [Toggle.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/ui/Toggle.tsx), [modal.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/ui/modal.tsx), [input.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/ui/input.tsx)
- **Toggle**: Implement standard Windows 11 style switches with rounded tracks, clean gray outlines when off, and solid primary colors when on.
- **Modal**: Centered modal cards with sharp shadows, translucent backdrops, and active border styling.
- **Input**: Use desktop text box styling (light glass background, bottom accent border highlight on active focus).

## Task 7: UI Components - Dropdown, Checkbox, Tooltip
**Files**: [dropdown.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/ui/dropdown.tsx), [Checkbox.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/ui/Checkbox.tsx), [tooltip.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/ui/tooltip.tsx)
- **Dropdown**: Align dropdown popups directly below trigger coordinates, using solid/glass borders and standard hover selectors.
- **Checkbox**: Fluent style checkbox with quick checkmark transitions and native-like sizing (16px).
- **Tooltip**: Rectangular tooltips styled like Windows desktop tooltips, utilizing a 500ms hover delay.

## Task 8: InfoCard and Greeting Components
**Files**: [infocard.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/infocard.tsx), [greeting.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/greeting.tsx)
- **InfoCard**: Refine icons to use subtle native border frames and consistent grid alignment.
- **Greeting**: Replace heavy animated shimmer effects with a clean, high-contrast headline that dynamically updates based on system timezone offsets.

## Task 9: Home Page (Dashboard) Redesign
**File**: [Home.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/pages/Home.tsx)
- Clean up the stats dashboard layout: divide system status categories into static grid sections.
- Make CTA alerts look like native Windows 11 Action Center messages rather than website alert boxes.

## Task 10: Tweaks Page Redesign
**File**: [Tweaks.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/pages/Tweaks.tsx)
- Redesign category selectors to resemble native tab controls.
- Style tweak list tables/cards with thin border separations and clear descriptive labels.

## Task 11: Apps Page Redesign
**File**: [Apps.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/pages/Apps.tsx)
- Configure package manager tabs to behave like a standard segmented control bar.
- Refine app download modals to resemble desktop download progress dialogs.

## Task 12: Clean, Utilities, DNS Pages Redesign
**Files**: [Clean.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/pages/Clean.tsx), [Utilities.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/pages/Utilities.tsx), [DNS.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/pages/DNS.tsx)
- Replace circular web load bars with native linear style progress meters.
- DNS: Align recommended DNS configurations in a clean list selection panel.

## Task 13: Backup and Settings Pages Redesign
**Files**: [Backup.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/pages/Backup.tsx), [Settings.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/pages/Settings.tsx)
- **Backup**: Layout restore checkpoints in clean tables with desktop action icons.
- **Settings**: Group settings into distinct expandable panels (Accordions) with native category icons.

## Task 14: Overlay Components Redesign
**Files**: [firsttime.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/firsttime.tsx), [updatemanager.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/updatemanager.tsx), [ErrorBoundary.tsx](file:///G:/main_file/programing%20hero/cloude%20code/Fylo%20Core/src/renderer/src/components/ErrorBoundary.tsx)
- Re-design the welcome screen as an overlay dialog with standard buttons.
- UpdateManager: Emulate standard desktop installer screens.

## Task 15: Final Polish and Verification
- Confirm build succeeds on electron-builder pipeline.
- Verify layout behaves correctly when scaling/resizing the desktop window.
- Verify full keyboard navigation and focus-outline accessibility paths.
