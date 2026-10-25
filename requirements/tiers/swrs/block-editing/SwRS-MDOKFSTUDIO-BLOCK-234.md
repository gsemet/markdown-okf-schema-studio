---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-234
uuid: 57887628-21f5-4723-9670-3d2875749c78
title: "Preview edits keep the line endings of the document"
description: "When the extension plans or writes back a preview edit, it SHALL treat
  LF, CR LF and a lone CR as line ends, count one more empty last line after a final
  line break, and keep the line ending that the edited text ended with, including
  the CR LF endings of a table and the presence or absence of its final line ending."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
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
- src/core/edits/textEdit.ts
- src/page/features/blockEditor.ts
- src/page/modules/markdownTable.ts
tested_in_files:
- test/core/edits/textEdit.test.ts
- test/page/modules/markdownTable.test.ts
- test/visual/scenarioDefinitions1.ts
---

## Preview edits keep the line endings of the document

### Normative behavior

When the extension plans or writes back a preview edit, it SHALL treat LF, CR LF and a lone CR as line ends, count one more empty last line after a final line break, and keep the line ending that the edited text ended with, including the CR LF endings of a table and the presence or absence of its final line ending.

### Scenario (nominal): A save restores the trailing line ending of the block

| Original block text ends with | Text posted by the save |
| --- | --- |
| LF | the text box content plus the same LF |
| CR LF | the text box content plus the same CR LF |
| CR | the text box content plus the same CR |
| no line ending (a block at the end of a file without a final line break) | the text box content with no trailing line break either |

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

### Known issues

- Known issue: (deduced from the code, not run) no code converts the LF line breaks that the text box returns back to the document's line ending inside a multi-line block. If VS Code writes that LF text into a CRLF document as CRLF, the next save finds a different text under the last written text and is refused with "The source block changed while it was being edited."

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-094: the insertion planner is the exception to the line counting

### Verification notes

- Method: Unit test `source lines split on LF, CRLF and CR, and a final line break adds an empty last line` in test/core/edits/textEdit.test.ts (Counting lines).
- Method: Visual scenarios block-editing/v01 and v02 in test/visual/scenarioDefinitions1.ts (A save restores the trailing line ending of the block: the autosave sends the exact text with its newline); test/page/runtimeBlockEditor.test.ts has no CRLF test and no test opens an inline editor on a CRLF block, so the CR LF and CR rows of that scenario are untested. The Known issue follows from trailingLineEnding, planBlockTextEdit and activeBlockEditSource and was not run in a real window.
- Method: Unit tests `a row inserted into a CRLF table keeps CRLF line endings` in test/page/modules/markdownTable.test.ts and `round trip preserves the source: crlf` in test/page/modules/markdownTablePreservation.test.ts (A CRLF table keeps its line endings).
- Criteria: start, end and text answer the same line for the same index; the appended ending is the one detected on the original text; no bare line feed in the output of a CRLF table.
