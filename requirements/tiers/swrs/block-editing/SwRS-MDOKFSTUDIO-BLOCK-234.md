---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-234
uuid: 57887628-21f5-4723-9670-3d2875749c78
title: "Preview edits keep the line endings of the document"
description: "When the extension plans or writes back a preview edit, it SHALL treat
  LF, CR LF and a lone CR as line ends, count one more empty last line after a final
  line break, and keep the line ending that the edited text ended with, write the
  line breaks inside an edited multi-line block with the one line ending the block
  (or, for a block of one line, the document) already uses, including the CR LF endings
  of a table and the presence or absence of its final line ending."
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-TABLE-011
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/edits/sourceEdits.ts
- src/core/edits/textEdit.ts
- src/page/features/blockEditor.ts
- src/page/modules/markdownTable.ts
tested_in_files:
- test/core/edits/sourceEdits.test.ts
- test/core/edits/textEdit.test.ts
- test/integration/realInput/qa210Replays.ts
- test/page/modules/markdownTable.test.ts
- test/session/blockReq.requirements.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
---

## Preview edits keep the line endings of the document

### Normative behavior

When the extension plans or writes back a preview edit, it SHALL treat LF, CR LF and a lone CR as line ends, count one more empty last line after a final line break, and keep the line ending that the edited text ended with, write the line breaks inside an edited multi-line block with the one line ending the block (or, for a block of one line, the document) already uses, including the CR LF endings of a table and the presence or absence of its final line ending.

### Scenario (nominal): A save restores the trailing line ending of the block

| Original block text ends with | Text posted by the save |
| --- | --- |
| LF | the text box content plus the same LF |
| CR LF | the text box content plus the same CR LF |
| CR | the text box content plus the same CR |
| no line ending (a block at the end of a file without a final line break) | the text box content with no trailing line break either |

### Scenario (nominal): A multi-line block keeps its line ending when saved
| Input | Outcome |
| --- | --- |
| A block of several lines in a CR LF document, a line added in the text box (which returns LF) | The lines written to the document, the new one included, end with CR LF |
| The same in a document whose lines end with a lone CR | The lines written end with CR |
| The same in a document with LF line breaks | The lines written end with LF |
| A block of one line, or the last block of a file without a final line break, in a CR LF or lone-CR document | The lines written end with the one line ending of the document |
| A block whose line endings are mixed, or a document with mixed line endings when the block has no line break | The text box content is written as it is |

### Scenario (nominal): A CRLF table keeps its line endings

| Input | Outcome |
| --- | --- |
| a CRLF table with a trailing line ending and a row inserted, then written back | all lines, the new one included, end with CRLF and the trailing line ending is kept |
| the same table with one cell edited, then written back | the line endings are unchanged |
| a CRLF table without a trailing line ending | the absence of the final line ending is kept |

### Scenario (boundary): Counting lines

| Input | Outcome |
| --- | --- |
| a document `a\r\nb\nc\rd` and an edit that names line 4 | the edit lands on `d`, because the text has four lines a, b, c and d |
| the text `a\n` and an edit that names line 2 | line 2 exists and is empty |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-094: the insertion planner counts lines and picks the inserted line ending the same way

### Verification notes

- Method: Unit test `source lines split on LF, CRLF and CR, and a final line break adds an empty last line` in test/core/edits/textEdit.test.ts (Counting lines).
- Method: Controller tests in test/session/blockReq.requirements.test.ts (`a block edit keeps the line ending of the document and the next save is not refused`, the mixed-endings document, the last block without a final line break) run the save through the in-memory host in LF, CR LF and CR documents.
- Method: Unit tests `a multi-line block edited in a LF|CRLF|CR document keeps ... inside the block` and `a block text with no line break or mixed line endings ...` in test/core/edits/sourceEdits.test.ts (A multi-line block keeps its line ending when saved; withLineEndingOf and planBlockTextEdit, the host calls both before each write; not run in a real window).
- Method: Visual scenarios block-editing/v01 and v02 in test/visual/scenarioDefinitions1.ts (A save restores the trailing line ending of the block: the autosave sends the exact text with its newline); test/page/runtimeBlockEditor.test.ts has no CRLF test and no test opens an inline editor on a CRLF block, so the CR LF and CR rows of that scenario are untested.
- Method: Unit tests `a row inserted into a CRLF table keeps CRLF line endings` in test/page/modules/markdownTable.test.ts and `round trip preserves the source: crlf` in test/page/modules/markdownTablePreservation.test.ts (A CRLF table keeps its line endings).
- Criteria: start, end and text answer the same line for the same index; the appended ending is the one detected on the original text; no bare line feed in the output of a CRLF table.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
  - [StRS-MDOKFSTUDIO-TABLE-011](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-011.md): A table converts between forms and a cell edit is a one-line change
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-058](SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
<!-- okf:links:end -->
