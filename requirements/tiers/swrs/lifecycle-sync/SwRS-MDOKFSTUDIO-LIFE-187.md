---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-187
uuid: 8d6b3a4f-b0b7-4bce-85cd-e485d768ca51
title: The side preview that follows the editor marks the line of a jump
description: When a jump moves a Markdown text editor to a line, the side
  preview that follows the active editor SHALL show the line marker on that line
  of the jump's document, posting it only to a visible page that shows that
  document within five seconds and dropping it after that, whichever of the jump
  and the switch of document comes first.
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
- src/host-vscode/activation.ts
- src/session/hostEvents.ts
tested_in_files:
- test/core/navigation/jumpSignal.test.ts
- test/host/editorJumps.test.ts
- test/integration/sidePreviewJump.test.ts
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## The side preview that follows the editor marks the line of a jump

### Normative behavior

When a jump moves a Markdown text editor to a line, the side preview that follows the active editor SHALL show the line marker on that line of the jump's document, posting it only to a visible page that shows that document within five seconds and dropping it after that, whichever of the jump and the switch of document comes first.

### Scenario (nominal): A search click in a file the side preview shows

- GIVEN a side preview that follows the editor and shows `doc.md`, whose page is ready and visible
- WHEN a jump to line 40 of `doc.md` arrives
- THEN the session posts previewRevealLine for line 40 and the page draws the line marker there

### Scenario (boundary): Routing

| Input | Outcome |
| --- | --- |
| only a Studio tab shows the file | it marks nothing |
| the jump is to another file, before the side preview switches to it | the line waits on the session, keyed by that document, and is posted once the page of that document is ready |
| the switch of document arrives before the jump | the line is posted at once |
| the page is hidden | the line waits for the page to report ready again |
| the line is older than 5 seconds | it is dropped |
| a line for a document the preview then leaves | it is dropped by the switch |
| several following side previews | only the latest marks |
| a jump on a diff side | it marks that line of the real file the side preview shows |

### Verification notes

- Method: test/session/toolbarReq.requirements.test.ts (routing, either order, window, hidden page), test/host/editorJumps.test.ts (the activation wiring) and test/integration/sidePreviewJump.test.ts (J2, J3, J5, J7).
- Criteria: each outcome of the table above holds. No setting gates this marker.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
<!-- okf:links:end -->
