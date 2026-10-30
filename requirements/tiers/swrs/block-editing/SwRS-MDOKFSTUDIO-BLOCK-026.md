---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-026
uuid: c8303fcc-815c-4718-a90d-a72604e7e906
title: "The editor opens with the caret at the clicked word"
description: "When a writer clicks rendered text in edit mode, the page SHALL place
  the caret of the opened text box at the source position of the clicked text, found
  by matching up to 32 rendered characters on each side of the click, and at the end
  of the block text without trailing line breaks when no unique place is found."
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-003
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/editMode.ts
- src/page/features/textControls.ts
- src/page/modules/textEditing.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/page/modules/textEditing.test.ts
- test/page/runtimeBlockEditor.test.ts
default_owner_email: gaetan@xeberon.net
---

## The editor opens with the caret at the clicked word

### Normative behavior

When a writer clicks rendered text in edit mode, the page SHALL place the caret of the opened text box at the source position of the clicked text, found by matching up to 32 rendered characters on each side of the click, and at the end of the block text without trailing line breaks when no unique place is found.

### Scenario (nominal): Emphasis and link markup

- GIVEN the source `Some **bold** text` and a click after the rendered text `Some bo`
- WHEN the editor opens
- THEN the caret sits at `Some **bo|ld** text`; heading marks, list markers, quote prefixes, emphasis marks and link targets are skipped when matching

### Scenario (nominal): Link label

- GIVEN the source `See [the label](https://x.y/z) here` and a click after the rendered text `See the la`
- WHEN the editor opens
- THEN the caret sits inside the label at `See [the la|bel](https://x.y/z) here`

### Scenario (boundary): Ambiguous text

- GIVEN the source `a a a a` and the click context `a a` before and ` a` after
- WHEN the editor opens
- THEN the caret sits at the end of the text

### Scenario (boundary): No caret API

- GIVEN a browser without caretRangeFromPoint and caretPositionFromPoint
- WHEN the writer clicks a paragraph
- THEN the caret sits at the end of the text

### Verification notes

- Method: test/page/modules/textEditing.test.ts (`mapRenderedCaret ` cases: emphasis and link markup, link label; `mapRenderedCaret ambiguous`, `mapRenderedCaret no match` and `mapRenderedCaret empty context`: ambiguous text).
- Method: test/page/runtimeBlockEditor.test.ts (`without caretRangeFromPoint a click opens the editor with the caret at the end of the block`: no caret API).
- Method: test/integration/realInput/editorWidgets.ts (scenarioCaretAtClick, screenshot block-editing/r11: emphasis and link markup); visual scenarios block-editing/v04 and block-editing/v05. A click in a table cell carries no caret context.
- Criteria: The mapped offset equals the offset expected by the table of cases; mapRenderedCaret returns undefined when no unique place is found and focusTextControlAtLastContent uses the trimmed length.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-003](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-003.md): A writer edits the raw Markdown of a block in a framed editor
<!-- okf:links:end -->
