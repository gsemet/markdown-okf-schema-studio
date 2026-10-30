---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-044
uuid: 5f576f13-4a41-412e-97a5-20e8432f4d84
title: Typing a marker character over a selection in a cell wraps it as one
  undoable step
description: When the writer types *, _, a backtick or ~ with text selected in
  the cell text box, the extension SHALL wrap the selection with that marker as
  one native edit and keep the text selected.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-006
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## Typing a marker character over a selection in a cell wraps it as one undoable step

### Normative behavior

When the writer types *, _, a backtick or ~ with text selected in the cell text box, the extension SHALL wrap the selection with that marker as one native edit and keep the text selected.

### Scenario: Wrap a word

- GIVEN the word "cell" selected in a cell
- WHEN the writer types *
- THEN the text becomes "*cell*" with "cell" still selected, in one undo step, and the change is autosaved

### Scenario: No selection or modifier

- GIVEN no text selected, or Cmd held, or an IME composition in progress
- WHEN the writer types *
- THEN the character is typed natively

### Verification notes

- Method: Unit test a table cell wraps its selection with the marker too in test/page/runtimeBlockEditor.test.ts.
- Criteria: The text box value and selection after the key; the undo grouping comes from the native insertText command and is not asserted.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-006](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-006.md): Tab, arrows and editing keys work in a table cell
<!-- okf:links:end -->
