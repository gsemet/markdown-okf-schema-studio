---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-050
uuid: 26a83b6b-f5a1-4613-b6ac-db9a0f89fa96
title: Soft appearance and colour transitions honour reduced motion
description: When the preview shows an editor, a bar, a menu, a closed editor or
  a theme change, the extension SHALL animate it softly by the rules of the
  scenarios and apply no preview motion when the user prefers reduced motion.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
- StRS-MDOKFSTUDIO-PALETTE-005
- StRS-MDOKFSTUDIO-THEME-002
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/propertiesStyles.ts
- src/page/features/themeMode.ts
- src/page/modules/motion.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/diagReq.themeZoom.requirements.test.ts
- test/page/modules/motion.test.ts
default_owner_email: gaetan@xeberon.net
---

## Soft appearance and colour transitions honour reduced motion

### Normative behavior

When the preview shows an editor, a bar, a menu, a closed editor or a theme change, the extension SHALL animate it softly by the rules of the scenarios and apply no preview motion when the user prefers reduced motion.

### Scenario (nominal): Soft appearance after the first input
- GIVEN a fresh page with no pointer press or key press yet
- WHEN an editor opens
- THEN it appears without animation
- AND after a first pointer press or key press, an editor, bar or menu that opens appears softly

### Scenario (nominal): No soft appearance after a content patch
- GIVEN soft appearance is on after a pointer press
- WHEN a content patch replaces the content and an editor opens
- THEN it appears without animation
- AND after a following key press, an editor that opens appears softly again

### Scenario (nominal): Palette, popovers and slash menu
- GIVEN soft appearance is on (the attribute data-sphinx-preview-motion is on)
- WHEN an edition palette appears
- THEN it starts transparent and fades in over the fast motion time of 120 ms
- AND a popover or the slash menu starts transparent 3 px above its place and fades in over the same time

### Scenario (nominal): Closed editor and theme change
| Input | Outcome |
| --- | --- |
| a block editor closes while soft appearance is on | the rendered block fades in |
| a theme switch | the colours transition once |
| the page idles after the switch | no transition repeats |

### Scenario (nominal): Reduced-motion attribute
| Input | Outcome |
| --- | --- |
| the system prefers reduced motion, page start or a theme change reported by the host | data-sphinx-preview-reduced-motion of the html element reads true |
| a system without that preference, or a window without matchMedia | the attribute reads false |

### Scenario (refusal): Reduced motion
| Input | Outcome |
| --- | --- |
| `prefers-reduced-motion: reduce` and a block changes | no glow, fade or transition runs |
| reduced motion and a block editor closes | the block appears without fade |
| reduced motion and the palette, a popover or the slash menu appears | shown without any fade |
| no such preference and a block changes | the glow runs |

### Verification notes
- Method: test/page/modules/motion.test.ts, tests "CR 046: editors and menus appear softly only after a pointer or key press, never after a patch" (soft appearance after the first input, after a content patch, closed editor), "CR 046: a theme switch transitions the colours once, until the body background has changed" (theme change), "CR 046: with prefers-reduced-motion: reduce nothing is marked to move" (reduced motion)
- Method: test/core/preview/previewStyles.test.ts, tests "CR 046: prefers-reduced-motion: reduce turns off every animation and transition of the motion layer" (reduced motion; the palette, popover and slash menu selectors are listed in the reduced-motion rule) and "CR 046: the motion layer is short and never animates layout or the table bar's transform" (palette, popovers and slash menu); the 3 px offset is not asserted
- Method: test/page/diagReq.themeZoom.requirements.test.ts, test "the page root records whether the system prefers reduced motion" (reduced-motion attribute)
- Criteria: Motion styles are disabled under the preference; the motion attribute is removed by a content patch and set again by input; one colour transition per switch; the fade class is applied on close; the palette rules are in propertiesStyles.ts under html[data-sphinx-preview-motion=on] with a starting-style of opacity 0 and, for the popovers and the slash menu, translate 0 -3px.
