---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-186
uuid: 2767cc1b-b30c-4d1f-9999-8e31900acd42
title: The host tells a jump from a cursor move
description: When a text editor of an eligible Markdown file, or a side of a
  text diff whose real file is one, reports a selection change of kind Command
  with one selection that Studio did not expect, the host SHALL read it as a
  jump to the line of that selection in the real file, and SHALL never read a
  Keyboard, a Mouse or a no-kind change, or a change with several selections, as
  a jump.
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
- src/host-vscode/editorJumps.ts
- src/host-vscode/studioSelections.ts
tested_in_files:
- test/core/navigation/jumpSignal.test.ts
- test/host/editorJumps.test.ts
- test/host/studioSelections.test.ts
- test/integration/sidePreviewJump.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host tells a jump from a cursor move

### Normative behavior

When a text editor of an eligible Markdown file, or a side of a text diff whose real file is one, reports a selection change of kind Command with one selection that Studio did not expect, the host SHALL read it as a jump to the line of that selection in the real file, and SHALL never read a Keyboard, a Mouse or a no-kind change, or a change with several selections, as a jump.

### Scenario (nominal): A search click is a jump

- GIVEN a saved Markdown file open in a text editor
- WHEN VS Code reports a selection change of kind Command with one selection on line 40
- THEN the host fires a jump to line 40 of that file, once

### Scenario (boundary): Moves that are not jumps

| Input | Outcome |
| --- | --- |
| a Keyboard or a Mouse change, or a change with no kind | no jump |
| a Command change with several selections | no jump |
| a Command change Studio asked for ("Open as Text", a link followed in the side preview), within 1 second, once | no jump; the entry is used up |
| a Command change on the same line within 1 second of such a request | read as Studio's own: no jump (stated limit) |
| a file that is not an eligible Markdown file | no jump |
| a side of a text diff whose real file is eligible, whichever side holds the selection | a jump to that real file |
| a diff with no eligible real file | no jump |

### Verification notes

- Method: test/core/navigation/jumpSignal.test.ts (the rules), test/host/studioSelections.test.ts (the expected selections), test/host/editorJumps.test.ts (the host events) and test/integration/sidePreviewJump.test.ts (J1: the kind each move carries in the real window).
- Criteria: each outcome of the table above holds. J1's table of kinds is in docs/user/open-studio.md.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
<!-- okf:links:end -->
