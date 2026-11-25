---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-279
uuid: 8bec7af4-b568-4ad0-b9c1-fa0a11b4c8be
title: The page does not follow an editor scroll caused by an edit
description: While a block editor applies an edit to the document through the
  autosave, the extension SHALL keep the editor open, the caret where the edit
  ended and the page where it was, ignoring the scroll of the text editor to the
  applied edit.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-005
scenarios:
- id: S1
  title: A pasted text is applied by the autosave
- id: S2
  title: After the guard window
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/blockEdits.ts
- src/session/features/scrollSync.ts
tested_in_files:
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## The page does not follow an editor scroll caused by an edit

### Normative behavior

While a block editor is open and the autosave applies the text of an edit to the document, the extension SHALL keep the page where it is: the scroll of the text editor to the applied edit does not move the page, from the start of the autosave until 750 ms after it settled.

### Scenario S1 (nominal): A pasted text is applied by the autosave

- GIVEN an open block editor and a large paste in its text box
- WHEN the autosave applies the pasted text to the document
- THEN the editor stays open, the caret stays where the paste ended and the page does not move, from the start of the autosave until 750 ms after it settled (CR 134)

### Scenario S2 (boundary): After the guard window

- GIVEN the autosave has settled more than 750 ms ago
- WHEN the text editor scrolls for another reason
- THEN the page follows that scroll as usual

### Verification notes

- Method: test/integration/tallBlockScroll.test.ts (the 90-paragraph paste: the caret at the end of the paste is in view and the page is not moved by the applied edit)
- Criteria: The page scroll offset is unchanged by the scroll of the text editor during the autosave and the 750 ms after it.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-005](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-005.md): While a writer edits a block, the palette stays in reach, appears softly and keeps the editor open
<!-- okf:links:end -->
