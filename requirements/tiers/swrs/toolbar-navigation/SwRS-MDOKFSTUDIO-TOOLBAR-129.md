---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-129
uuid: 5f4891e8-e88f-4d47-b157-341ff6740304
title: Toolbar, edit bar and table menu tooltips slide in from the left
description: When the reader hovers or focuses a button of the floating toolbar,
  the edit bar or the table menu, the extension SHALL show its tooltip bubble
  sliding in from 6 px to the left of its place while fading in over 120 ms,
  with one shared animation, and SHALL show it without motion when the user
  prefers reduced motion.
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
tested_in_files:
- test/core/preview/previewStyles.test.ts
default_owner_email: gaetan@xeberon.net
---

## Toolbar, edit bar and table menu tooltips slide in from the left

### Normative behavior

When the reader hovers or focuses a button of the floating toolbar, the edit bar or the table menu, the extension SHALL show its tooltip bubble sliding in from 6 px to the left of its place while fading in over 120 ms, with one shared animation, and SHALL show it without motion when the user prefers reduced motion.

### Scenario (nominal): One slide-in for every bubble
| Input | Outcome |
| --- | --- |
| hover or keyboard focus on a button of the floating toolbar | the bubble fades in over 120 ms while moving 6 px from the left to its place |
| the same on a button of the edit bar | the same animation |
| the same on a button of the table menu | the same animation |

The three bubbles share one keyframes rule (sphinx-preview-tooltip-in) and the fast motion time; it moves the bubble with the translate property, so each bubble keeps its own anchoring.

### Scenario (refusal): Reduced motion
- GIVEN the user prefers reduced motion
- WHEN a button of the toolbar, the edit bar or the table menu is hovered or focused
- THEN the bubble appears without animation

### Verification notes
- Method: test/core/preview/previewStyles.test.ts, tests "CR 162: every tooltip bubble slides in from the left with one shared animation" (nominal) and "CR 162: reduced motion turns off the tooltip slide-in and the toolbar rows unroll" (refusal)
- Criteria: the hover and focus rules of the three bubbles name the shared keyframes with the 120 ms fast time; the keyframes start at translate -6px and opacity 0; the reduced-motion rule lists the three bubbles
