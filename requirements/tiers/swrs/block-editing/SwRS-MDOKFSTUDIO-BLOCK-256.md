---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-256
uuid: e532194a-79cc-40b5-8a63-d33a82d24743
title: "The host refuses a block edit whose first line is blank"
description: "When a block edit (open, autosave or Done) names a range whose first
  line is blank, the host SHALL answer with an error telling that the preview and
  the document disagree about the block's lines, open no editor and change nothing."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-006
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-094
- SwRS-MDOKFSTUDIO-BLOCK-124
- SwRS-MDOKFSTUDIO-BLOCK-216
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/blockRange.ts
- src/session/features/blockEdits.ts
tested_in_files:
- test/core/mapping/blockRange.test.ts
- test/session/blockRangeGuard.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host refuses a block edit whose first line is blank

### Normative behavior

When a block edit (open, autosave or Done) names a range whose first line is blank, the host SHALL answer with an error telling that the preview and the document disagree about the block's lines, open no editor and change nothing.

### Scenario (refusal): A range shifted onto a blank line

- GIVEN a document whose heading "### Edit MyST visually" is on line 12 and a page that sends the range 11 to 12, as a line shift of the preview did for the blocks after a GitHub alert
- WHEN the page opens the block editor, or saves it with Done or an autosave
- THEN the host answers with "The preview and the document disagree about this block's lines. Refresh the preview and try again.", opens no editor and the document text is unchanged

### Scenario (refusal): Ranges outside the document keep their own reason

| Input | Outcome |
| --- | --- |
| A range that ends after the last line of the document | Refused as stale, see SwRS-MDOKFSTUDIO-BLOCK-216, and nothing changes |
| A range whose first line is blank | Refused with the reason above |

### Scenario (nominal): Blocks with blank lines inside are edited

- GIVEN blocks that contain blank lines (a fenced code block, a diagram fence, a directive or admonition, a list-table, a loose list, a blockquote, a GFM alert, an HTML block) with the ranges the renderer gives them
- WHEN the page opens the block editor on one of them
- THEN the host answers with the exact text of the range and no error

### Scenario (nominal): A list ends on its blank separator

- GIVEN a list or list item whose rendered range ends on the blank line that follows it
- WHEN the page opens the block editor on it
- THEN the host accepts the range; only the first line of a range is checked for blank, not its last

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-041: the one-edit-at-a-time rule that the open belongs to
- SwRS-MDOKFSTUDIO-BLOCK-094: the block editor open and save
- SwRS-MDOKFSTUDIO-BLOCK-124: the same kind of check for moves and clipboard edits
- SwRS-MDOKFSTUDIO-BLOCK-216: the stale answers of a refused open or save

### Verification notes

- Method: test/core/mapping/blockRange.test.ts (`checkBlockLines`) and test/session/blockRangeGuard.test.ts (open and save through the real preview manager, and every mapped block of a document with all block kinds, with the ranges of the renderer).
- Criteria: a range starting on a blank line is answered with the reason above, posts no original text and leaves the document unchanged; every renderer range of the kind document is accepted.
