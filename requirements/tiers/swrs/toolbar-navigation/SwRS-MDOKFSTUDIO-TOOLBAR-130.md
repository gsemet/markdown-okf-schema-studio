---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-130
uuid: 1bf95932-5bcf-4b93-8151-400fc118d94d
title: The toolbar rows unroll as one block and a load hint shows them
description: When the reader expands or collapses the toolbar, the extension
  SHALL unroll or roll up rows 2 to 5 as one block over 160 ms (height and
  fade), and when a panel opens its preview with the toolbar saved as collapsed,
  the extension SHALL unroll the rows once for 700 ms and roll them up again
  without changing the saved choice, cancelled by any pointer or key press, and
  with no motion when the user prefers reduced motion.
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/pageChromeStyles.ts
- src/core/preview/styles/propertiesStyles.ts
- src/page/features/scrollCore.ts
- src/page/modules/toolbarCollapse.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/modules/toolbarCollapse.test.ts
- test/page/runtimeToolbarHint.test.ts
default_owner_email: gaetan@xeberon.net
---

## The toolbar rows unroll as one block and a load hint shows them

### Normative behavior

When the reader expands or collapses the toolbar, the extension SHALL unroll or roll up rows 2 to 5 as one block over 160 ms (height and fade), and when a panel opens its preview with the toolbar saved as collapsed, the extension SHALL unroll the rows once for 700 ms and roll them up again without changing the saved choice, cancelled by any pointer or key press, and with no motion when the user prefers reduced motion.

### Scenario (nominal): Rows 2 to 5 unroll and roll up as one block
- GIVEN a preview with the toolbar
- WHEN the reader presses the chevron
- THEN rows 2 to 5 get the animating mark before the hidden attribute changes, unroll (from zero height, fading in) or roll up (height and opacity to zero) together over 160 ms, and lose the mark at the end
- AND the layout is measured again when the animation ends

### Scenario (nominal): Load hint
| Input | Outcome |
| --- | --- |
| a panel opens its preview, the saved choice is collapsed, no hint was shown yet for this panel | two frames after the page starts (the collapsed toolbar is painted first) the rows unroll, stay open 700 ms, and roll up; the root carries data-sphinx-preview-toolbar-hint meanwhile |
| a pointer press or key press (not on the chevron) while the hint runs | the hint stops and the rows are hidden at once; a press or key on the chevron is left to its click, which keeps the open rows as they are (no new animation) |
| the hint ends or is cancelled | the saved choice, the toolbar state attribute, aria-expanded and the posted preferences are unchanged |
| a refresh, a reload, a content patch, or the panel following another document | no hint (a boolean in the webview state, carried by every state snapshot, records that the panel showed it) |
| the pending overlay while the hint runs | it stays below the five open rows |
| the toolbar is saved as expanded | no hint and no animation at page start |

### Scenario (refusal): Reduced motion
- GIVEN the user prefers reduced motion
- WHEN the page starts or the chevron is pressed
- THEN the rows are shown or hidden without animation and without the hint

### Verification notes
- Method: test/page/modules/toolbarCollapse.test.ts (marks, hint timing, cancel, chevron click or key during the hint, once per panel, saved choice, reduced motion)
- Method: test/page/runtimeToolbarHint.test.ts (the ready and scroll state snapshots keep the "hint shown" mark; a page started from the saved state shows no hint)
- Method: test/core/preview/previewStyles.test.ts, tests "CR 162: the toolbar rows unroll as one block, only under the animating mark" and "CR 162: reduced motion turns off the tooltip slide-in and the toolbar rows unroll"
- Criteria: the animating mark precedes the hidden change; the hint starts two frames after the page starts and lasts 700 ms; nothing is posted; the stylesheet animates height and opacity over the 160 ms time under the mark only
