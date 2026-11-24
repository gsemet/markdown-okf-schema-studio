---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-188
uuid: 24528575-690d-4d5e-a81c-47279969ded0
title: The side preview's scroll on a jump follows the anchor setting
description: When the side preview marks the line of a jump, it SHALL ask the
  page to scroll only when the line is off screen and leave the scroll anchor to
  the editor while scrolling the preview with the editor is on, and SHALL ask
  the page to scroll the line to the reading line and take it as its anchor
  while that setting is off.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-023
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/hostHandlers.ts
- src/session/features/scrollSync.ts
- src/session/hostEvents.ts
tested_in_files:
- test/core/protocol/hostToPage.test.ts
- test/page/runtimeLineMarker.test.ts
- test/session/toolbarReq.requirements.test.ts
- test/visual/lineMarkerScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## The side preview's scroll on a jump follows the anchor setting

### Normative behavior

When the side preview marks the line of a jump, it SHALL ask the page to scroll only when the line is off screen and leave the scroll anchor to the editor while scrolling the preview with the editor is on, and SHALL ask the page to scroll the line to the reading line and take it as its anchor while that setting is off.

### Scenario (nominal): Scroll sync on, the line is on screen

- GIVEN the side preview with scroll with editor on, and line 40 already on screen below the sticky headings
- WHEN a jump to line 40 arrives
- THEN the marker is drawn on line 40, the page does not move and the jump takes no anchor

### Scenario (boundary): Scroll modes

| Input | Outcome |
| --- | --- |
| scroll sync on, the line is off screen | the page scrolls the line to the reading line, takes no anchor |
| scroll sync off | the page scrolls the line to the reading line and the line becomes the anchor |
| the reveal carries no scroll field | it is read as reading-line |
| a scroll field other than reading-line or if-off-screen | the router refuses the message |
| a closed dropdown or a folded section holds the line | it opens, in both modes |

### Verification notes

- Method: test/page/runtimeLineMarker.test.ts, test/core/protocol/hostToPage.test.ts, test/session/toolbarReq.requirements.test.ts and the visual scenario lifecycle-sync/v13-line-marker-jump-if-off-screen-light-900.
- Criteria: each outcome of the table above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
<!-- okf:links:end -->
