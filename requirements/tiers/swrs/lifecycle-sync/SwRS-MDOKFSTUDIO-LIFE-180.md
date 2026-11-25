---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-180
uuid: f238dbea-dc5c-4392-a18a-acb45a436562
title: The line marker in edit mode covers no handle or action and opens no
  editor
description: In edit mode the page SHALL draw the line marker over neither the
  list item handles, the table row handles nor the block actions, and SHALL open
  no block editor on its own because of the marker.
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
- src/core/preview/styles/lineMarkerStyles.markers.ts
- src/page/features/lineMarker.ts
tested_in_files:
- test/page/runtimeLineMarker.test.ts
- test/visual/lineMarkerScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## The line marker in edit mode covers no handle or action and opens no editor

### Normative behavior

In edit mode the page SHALL draw the line marker over neither the list item handles, the table row handles nor the block actions, and SHALL open no block editor on its own because of the marker.

### Scenario S1 (nominal): Nominal case

- GIVEN edit mode on a page with a table, at line 41 (a table row)
- WHEN the page receives previewRevealLine for line 41
- THEN the marker is drawn, its arrow overlaps no row, column or list handle and no block action, and no block editor opens

### Scenario S2 (boundary): Boundary cases

| Input | Outcome |
| --- | --- |
| the overlay | pointer-events none, aria-hidden, under the handles in z-order |
| the arrow | drawn in the 32 px margin left of the column where handles sit above it |
| a table row at fixture line 43 (body row 2); line 41 (the delimiter line) | the row is marked (the header row for the delimiter line), the arrow meets no row handle |
| a property row and a tab-panel line | the marker is drawn, the arrow meets no control and no block editor opens |

### Verification notes

- Method: test/page/runtimeLineMarker.test.ts ("in edit mode the marker opens no editor and the overlay is never an edit target") and the visual scenario lifecycle-sync/v06, which measures the arrow against every handle (Linux and macOS CI only).
- Criteria: each outcome of the tables above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
<!-- okf:links:end -->
