---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-256
uuid: 79d732bc-81ca-4028-a8f3-1d259aa0a0dc
title: The slash menu stays next to the caret inside the viewport
description: When the slash menu opens, the extension SHALL place it under the
  caret line inside the viewport, uncovered by the floating toolbar, with a
  maximum height of 320 px and an edge of 8 px, above the caret when there is no
  room below, and keep it next to the caret while the writer types, scrolls or
  resizes.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-015
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/slashMenu.ts
tested_in_files:
- test/page/modules/slashMenu.test.ts
default_owner_email: gaetan@xeberon.net
---

## The slash menu stays next to the caret inside the viewport

### Normative behavior

When the slash menu opens, the extension SHALL place it under the caret line inside the viewport, uncovered by the floating toolbar, with a maximum height of 320 px and an edge of 8 px, above the caret when there is no room below, and keep it next to the caret while the writer types, scrolls or resizes.

### Scenario (nominal): Room below
- GIVEN a caret with room below
- WHEN the menu opens
- THEN it sits under the caret line, inside the viewport and clear of the floating toolbar, no taller than 320 px

### Scenario (boundary): No room below
- GIVEN a caret near the bottom of the viewport
- WHEN the menu opens
- THEN it sits above the caret line

### Scenario (nominal): The left edge stays while the query grows
- GIVEN an open menu
- WHEN the writer types more letters
- THEN the left edge of the menu, relative to the text box, does not move

### Scenario (boundary): Pane edge
- GIVEN a caret close to the right edge of a pane
- WHEN the menu opens
- THEN the menu is pulled left to stay inside the viewport, at least 8 px from the viewport edge

### Scenario (nominal): The menu follows the caret
| Given | When | Outcome |
| --- | --- | --- |
| an open menu | the page scrolls or the window resizes | the menu moves with the caret |
| an open menu with a long list | the list inside the menu scrolls | the menu does not move |

### Scenario (boundary): The caret scrolls out of the viewport
| Given | When | Outcome |
| --- | --- | --- |
| the caret scrolled above or below the viewport | the page scrolls | the menu closes |
| the caret still in the viewport | the page scrolls | the menu stays open |

### Verification notes

- Method: test/page/modules/slashMenu.test.ts (scenarios "Room below", "No room below", "The left edge stays while the query grows", "The menu follows the caret", "The caret scrolls out of the viewport")
- Method: visual scenarios palette-slash/v11-slash-strict-light-900, palette-slash/v12-slash-gfm-light-900, palette-slash/v13-slash-myst-light-900, palette-slash/v14-slash-myst-filtered-dark-900 ("Room below": inside the viewport, uncovered, clear of the toolbar), palette-slash/v21-slash-gfm-light-360 ("The left edge stays while the query grows")
- Criteria: The menu is a fixed element of the page; its data-slash-placement is above or below. The left edge is at least 8 px from the viewport edge. The listeners for scroll and resize are removed when the menu closes. The caret test is the caret rectangle against the viewport height.
