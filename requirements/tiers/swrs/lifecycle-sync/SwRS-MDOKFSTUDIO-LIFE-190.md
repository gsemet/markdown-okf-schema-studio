---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-190
uuid: 10f6fc49-2bff-4aad-9f42-fa0f0a735235
title: A cursor move never marks the side preview
description: When the reader moves the cursor with the keyboard or the mouse, or
  the editor reports a selection change of no kind, the side preview SHALL NOT
  show the line marker.
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
- src/core/navigation/jumpSignal.ts
tested_in_files:
- test/core/navigation/jumpSignal.test.ts
default_owner_email: gaetan@xeberon.net
---

## A cursor move never marks the side preview

### Normative behavior

When the reader moves the cursor with the keyboard or the mouse, or the editor reports a selection change of no kind, the side preview SHALL NOT show the line marker.

### Scenario (nominal): Arrow keys do not mark

- GIVEN the side preview with no line marker
- WHEN the reader moves the cursor over 20 lines with the arrow keys
- THEN no marker is drawn

### Scenario (boundary): Other cursor moves

| Input | Outcome |
| --- | --- |
| a click, Page Down, Ctrl+End, typing, undo | no marker |
| a selection change with no kind | no marker |
| Go Back, a selection set through the API (J1 recorded no selection change for either) | no marker |
| a move that carries Command with one selection (Go to Symbol, F3: not driven by J1, not verified) | it marks, as a search click does (stated limit) |

### Verification notes

- Method: test/core/navigation/jumpSignal.test.ts and test/integration/sidePreviewJump.test.ts (J1, J4).
- Criteria: each outcome of the table above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
<!-- okf:links:end -->
