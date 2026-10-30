---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-132
uuid: 87eb9197-6b57-4a24-841a-4dd09a11d04d
title: Definition list makes the selection a term with a definition
description: "When the writer presses Definition list, the extension SHALL add a line
  `: Definition` below the touched lines and select Definition, or insert a sample
  term and definition after the text when nothing is selected."
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
default_owner_email: gaetan@xeberon.net
---

## Definition list makes the selection a term with a definition

### Normative behavior

When the writer presses Definition list, the extension SHALL add a line `: Definition` below the touched lines and select Definition, or insert a sample term and definition after the text when nothing is selected.

### Scenario (nominal): Selection

- GIVEN the selected line Alpha
- WHEN Definition list is pressed
- THEN the line `: Definition` follows Alpha and Definition is selected

### Scenario (nominal): Sample

- GIVEN the caret after Intro
- WHEN Definition list is pressed
- THEN the lines Term and `: Definition` follow Intro after a blank line, with Term selected

### Scenario (boundary): The term text

| Input | Outcome |
| --- | --- |
| A selected line | The text of the term is not changed |

### Verification notes

- Method: test/page/modules/editActions.test.ts, through test/page/modules/editActions.test.ts (unit test "deflist makes the selection the term and selects the definition": scenarios Selection, Sample and The term text)
- Criteria: The text of the term is not changed.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
<!-- okf:links:end -->
