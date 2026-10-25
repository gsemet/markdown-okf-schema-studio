---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-140
uuid: 678fff4f-a720-4524-981f-bb303a9452ba
title: Reference and Citation open a filterable list filled by the host
description: When the writer presses Reference or Citation, the extension SHALL
  open a popover with a filter field, show Loading... until the host answers,
  and then list one button per entry with its detail text, narrowed by the words
  typed in the filter.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-013
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-031
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/editPalettePopovers.ts
tested_in_files:
- test/page/modules/editPalette.test.ts
- test/page/modules/paletteReq.requirements.test.ts
---

## Reference and Citation open a filterable list filled by the host

### Normative behavior

When the writer presses Reference or Citation, the extension SHALL open a popover with a filter field, show Loading... until the host answers, and then list one button per entry with its detail text, narrowed by the words typed in the filter.

### Scenario (nominal): Reference and Citation lists

| Given | Pressing | Outcome |
| --- | --- | --- |
| A document with the labels intro and setup | Reference | The popover shows a filter field named Filter reference, Loading... and then the labels, each followed by the heading or text after it |
| The workspace holds bibliography entries | Citation | The filter field is named Filter citation and the keys are listed with their titles |

The popover holds an input with data-choice-filter and a list; an entry button shows the label, an em dash and the detail when there is one. A page without a way to ask the host shows The list is not available here. The host request and its answer are in SwRS-MDOKFSTUDIO-TRUST-090.

### Scenario (nominal): The filter narrows the entries

- GIVEN the list shown
- WHEN the writer types a word of a label
- THEN only the entries whose value or detail contains every typed word, ignoring case, remain
- AND when the filter is emptied, all entries are shown again

The words are split on blanks; the label text of an entry that is not its value or detail is not matched.

### Scenario (nominal): Keys in the filter and on the entries

| Input | Outcome |
| --- | --- |
| Enter in the filter with the list narrowed to two entries | The first of the two is inserted |
| Enter in the filter with a filter that matches nothing | Nothing is inserted and the list stays open |
| Cmd or Ctrl with Enter in the filter | The list closes and the edit is finished instead |
| ArrowDown, ArrowDown and ArrowUp from the filter | The focus goes to the first entry, the second entry and the first entry again |
| ArrowUp on the first entry | The focus goes back to the filter |
| Escape in the filter or on an entry | The popover closes and the focus returns to the text box |

### Scenario (boundary): Empty list, host error and truncation

| Host answer | Outcome |
| --- | --- |
| No entry for Reference (a document without labels) | Loading... is replaced by No label found. Add one with the Label button. |
| No entry for Citation | Loading... is replaced by No citation key found in the workspace .bib files. |
| An error with a reason | The reason replaces the list |
| An answer with the truncated flag | The note More entries exist. Type to narrow the list. is the last line of the list |
| An answer without the flag | No note is shown |
| An answer that arrives after the popover closed | It is ignored |

The note is appended after the entries only when result.truncated is true.

### Known issues

- Known issue: see SwRS-MDOKFSTUDIO-TRUST-065 (the refusal that the out-of-date reason produces after the editor has saved a change).

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-147: a chosen label is written as a ref role.
- SwRS-MDOKFSTUDIO-PALETTE-031: palette popovers open in the frame, one at a time, and Escape or typing closes them.

### Verification notes

- Method: test/page/modules/editPalette.test.ts (unit tests "Reference opens a filter popover, lists the host's labels and inserts the chosen one": scenario Reference and Citation lists; "Enter in the filter picks the first match; Escape closes": the filter, Enter and Escape rows; "an empty list or a host error is said in the popover; a late answer after closing is ignored": scenario Empty list, host error and truncation)
- Method: test/page/modules/paletteReq.requirements.test.ts (unit test "a truncated Reference list ends with the note that more entries exist; a complete one has none": the truncated rows)
- Method: test/integration/mystPickers.test.ts (the labels first and second and the keys smith2024 and zed with the title Smith title: Reference and Citation lists)
- Method: the arrow navigation through the entries is deduced from the code (buildChoices) and not tested
- Criteria: The popover holds an input with data-choice-filter and a list; an entry button shows the label, an em dash and the detail when there is one; Cmd or Ctrl with Enter closes the list and finishes the edit instead; Escape closes the popover and returns the focus to the text box.
