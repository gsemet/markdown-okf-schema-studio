---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-174
uuid: c91a9fc1-1440-42e3-ac76-1e028172dc5e
title: "Paste inserts the clipboard as new blocks after the selection or insert point"
description: "When a writer presses the platform paste chord with blocks selected,
  or with an insert point focused, in edit mode and with no editor open, the extension
  SHALL insert the clipboard text as new blocks after the selection or the insert
  point, without the blank lines at both ends of the text, in the line breaks of the
  document, with one blank line before and after and without gluing them to their
  neighbours, and refuse with a reason, changing nothing, when the clipboard has no
  text or the document changed while it was read."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-016
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/blockRange.ts
- src/page/features/blockSelectionView.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/core/mapping/blockRange.test.ts
- test/integration/blockClipboard.test.ts
- test/page/runtimeBlockSelection.test.ts
- test/session/blockReq.requirements.test.ts
---

## Paste inserts the clipboard as new blocks after the selection or insert point

### Normative behavior

When a writer presses the platform paste chord with blocks selected, or with an insert point focused, in edit mode and with no editor open, the extension SHALL insert the clipboard text as new blocks after the selection or the insert point, without the blank lines at both ends of the text, in the line breaks of the document, with one blank line before and after and without gluing them to their neighbours, and refuse with a reason, changing nothing, when the clipboard has no text or the document changed while it was read.

### Scenario (nominal): Paste after a selection

- GIVEN two selected blocks ending at line 10
- WHEN the writer presses Ctrl+V
- THEN previewBlocksPaste carries insertAfterLine 10 and the first line of the last block as pin

### Scenario (nominal): Paste after a focused insert point

- GIVEN no selection and the insert point of a block ending at line 6 focused
- WHEN the writer presses Ctrl+V
- THEN previewBlocksPaste carries insertAfterLine 6; an insert point for line 0 pastes at the start of the body

### Scenario (nominal): Padded clipboard

- GIVEN the clipboard text `\n\nIntro.\n\n` pasted at the start of the body
- WHEN the paste is applied
- THEN the text `Intro.` follows the frontmatter after one blank line and precedes the next block after one blank line

### Scenario (boundary): Line breaks and a glued neighbour

- GIVEN a CR LF document where the next block directly follows the paste line
- WHEN the paste is applied
- THEN CR LF is used and the new text is not glued to the following block

### Scenario (refusal): Empty clipboard

| Input | Outcome |
| --- | --- |
| A clipboard that holds `  \n`, a paste is requested | The answer is ok false with "The clipboard has no text to paste." and the document is unchanged |
| A clipboard with a paragraph, a paste is requested | The paragraph is inserted |

### Scenario (refusal): The document changed while the clipboard was read

| Input | Outcome |
| --- | --- |
| A paste whose clipboard read is pending while the document is edited | When the read completes, the answer is ok false with "The document changed while pasting. Try again." and nothing changes |
| No change during the read | When the read completes, the paste is planned |

A paste after a line that does not exist, that is blank or that lies in the frontmatter, and a paste next to an included block, are refused as stated in SwRS-MDOKFSTUDIO-BLOCK-124 and SwRS-MDOKFSTUDIO-BLOCK-127. An open editor refuses the paste as stated in SwRS-MDOKFSTUDIO-BLOCK-041. A successful paste clears the block selection as stated in SwRS-MDOKFSTUDIO-BLOCK-169.

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-166: copy produces the Markdown that paste inserts
- SwRS-MDOKFSTUDIO-BLOCK-169: cut shares the answer and the selection clearing
- SwRS-MDOKFSTUDIO-BLOCK-243: the accepted shape of previewBlocksPaste

### Verification notes

- Method: test/page/runtimeBlockSelection.test.ts (paste after a selection and after a focused insert point: `T40: Ctrl+V pastes after the selection, or after the block of a focused bar`).
- Method: test/core/mapping/blockRange.test.ts (padded clipboard, CR LF, glued neighbour, start of the body, empty clipboard: `pastedBlockText trims blank lines at both ends and normalises line breaks`, `paste inserts after a block with one blank line on each side`, `paste does not glue the new text to a block that follows without a blank line`, `paste at the start of the body`, `paste keeps CRLF`, `paste refuses an empty clipboard, the frontmatter and stale lines`).
- Method: test/integration/blockClipboard.test.ts (paste after a selection or insert point, empty clipboard).
- Method: test/session/blockReq.requirements.test.ts (`a paste is refused when the document changed while the clipboard was read`).
- Criteria: The paste line is the end line of the selection or the insert point's line; planPaste output equals the expected text or returns the refusal; the revision is compared after the read.
