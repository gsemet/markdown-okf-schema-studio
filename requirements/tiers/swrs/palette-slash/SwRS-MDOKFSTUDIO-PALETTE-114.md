---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-114
uuid: a8359f9d-b1df-46d8-87e8-693b1f0fdd53
title: Thread inserts an empty comment thread after the block with the author
  and the date
description: When the writer presses Thread, the extension SHALL insert after
  the block at the caret a comment made of the line `<!-- THREAD`, a line with
  the author and the local date and time, an indented empty line and the line
  `-->`, with the caret on the empty line.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/inlineEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
---

## Thread inserts an empty comment thread after the block with the author and the date

### Normative behavior

When the writer presses Thread, the extension SHALL insert after the block at the caret a comment made of the line `<!-- THREAD`, a line with the author and the local date and time, an indented empty line and the line `-->`, with the caret on the empty line.

### Scenario (nominal): After a paragraph

- GIVEN the author Ada Lovelace and the caret in A paragraph.
- WHEN Thread is pressed
- THEN after the paragraph and a blank line the thread skeleton with Ada Lovelace and the date as YYYY-MM-DD HH:MM is inserted and the caret is on the indented line

### Scenario (boundary): Empty block and no author

- GIVEN an empty text and no author name
- WHEN Thread is pressed
- THEN the thread starts at the top without blank lines and the author is Anonymous

### Scenario (boundary): Author name with control characters

| Input | Outcome |
| --- | --- |
| Author name with control characters | The control characters become blanks and runs of blanks collapse |
| Author name that is empty after this cleaning | The author is Anonymous |

### Verification notes

- Method: test/page/modules/editActions.test.ts, through test/page/modules/editActions.test.ts (unit test "thread inserts an empty comment thread after the block, with the author and the local date": scenarios "After a paragraph", "Empty block and no author" and "Author name with control characters": the author Ada, a line break, Lovelace and the anonymous case)
- Criteria: Control characters of the author become blanks and blanks collapse; an empty result is Anonymous. The rendering and the replies of threads belong to the review annotation requirements.
