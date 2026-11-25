---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-179
uuid: 601cd882-9347-4d5b-a59b-badb5f51181c
title: The line marker stays through scrolls and layout changes and goes on a
  pointer press, an edit or a new line
description: While a line marker is shown, the page SHALL keep it when the
  reader scrolls, draw it again at its source line after a re-render, a content
  patch or a layout change, and remove it when the reader presses the pointer in
  the page, when an edit starts, or move it when another line is requested.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-023
scenarios:
- id: S1
  title: Nominal case
- id: S2
  title: Boundary cases
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/lineMarker.ts
tested_in_files:
- test/page/runtimeLineMarker.test.ts
- test/page/runtimeLineMarkerPlacement.test.ts
- test/visual/lineMarkerScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## The line marker stays through scrolls and layout changes and goes on a pointer press, an edit or a new line

### Normative behavior

While a line marker is shown, the page SHALL keep it when the reader scrolls, draw it again at its source line after a re-render, a content patch or a layout change, and remove it when the reader presses the pointer in the page, when an edit starts, or move it when another line is requested.

### Scenario S1 (nominal): Nominal case

- GIVEN a line marker is shown on line 20
- WHEN the reader scrolls, resizes the pane, or the page content is replaced
- THEN the marker is drawn again on line 20; a pointer press in the page then removes it

### Scenario S2 (boundary): Boundary cases

| Input | Outcome |
| --- | --- |
| another line requested | the marker moves to the new line |
| the line is folded away by the reader later | the marker is not drawn until the line shows again |
| an edit starts (focus in a block or frontmatter editor) | the marker is removed |
| another tab of the set is shown (keyboard or sync group) | the marker is not drawn until its tab shows again |
| the reader collapses the properties table | the marker is not drawn, and a later placement never expands the table |
| a full page reload | the marker is lost (known limit) |

### Verification notes

- Method: test/page/runtimeLineMarker.test.ts ("the marker stays when the reader scrolls and is placed again after a layout change", "a pointer press, an edit or a new line removes or moves the marker"). A keyboard-started edit that posts a source edit without a focus change is not detected on its own.
- Criteria: each outcome of the tables above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
<!-- okf:links:end -->
