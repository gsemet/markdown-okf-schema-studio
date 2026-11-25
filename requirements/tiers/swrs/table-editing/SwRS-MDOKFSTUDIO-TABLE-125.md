---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-125
uuid: 91eef40b-4aeb-4051-929c-0a157f504266
title: The cell left shows its typed text rendered
description: When the writer moves the editor away from a cell whose text was
  typed or changed, the extension SHALL show in that cell the text just typed,
  rendered as inline Markdown, without waiting for a render.
project: markdown-okf-schema-studio
scope: table-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-006
scenarios:
- id: S1
  title: The cell left shows its new text
annotation_exemption: false
exemption_reason:
derived_by: []
supersedes:
- SwRS-MDOKFSTUDIO-TABLE-035
implemented_in_files:
- src/page/features/tableCellEditor.ts
tested_in_files:
- test/integration/realInput/tableStaleRender.ts
- test/page/cellInlineMarkdown.test.ts
- test/page/runtimeTableCellEditor.test.ts
- test/page/runtimeTableCellStale.test.ts
default_owner_email: gaetan@xeberon.net
---

## The cell left shows its typed text rendered

### Normative behavior

When the editor leaves a cell whose text was typed or changed (by Tab, Shift+Tab or an arrow key), the extension SHALL show in that cell the text just typed, rendered as inline Markdown (code, strong, emphasis, strikethrough, links, line breaks), without waiting for a re-render and without requesting a render or posting a save.

### Scenario S1 (nominal): The cell left shows its new text

- GIVEN the editor in a cell whose text was typed or changed (the first cell of a row just added, or a cell with an older rendering), the cell holding no re-rendered content
- WHEN the writer presses Tab, Shift+Tab or an arrow key that moves the editor to another cell
- THEN the cell left shows the text just typed, with its inline Markdown (code, strong, emphasis, strikethrough, links, line breaks) rendered, and not the content it showed when the editor opened in it (empty for a new row); a cell whose text was not changed keeps its rendering; no render is requested and no final save is posted

### Related requirements

- SwRS-MDOKFSTUDIO-TABLE-123: the moves that leave a cell.

### Verification notes

- Method: test/page/runtimeTableCellEditor.test.ts (the cell left shows its new text: a new row, a changed cell, each of the four arrow keys).
- Method: test/page/cellInlineMarkdown.test.ts (the inline Markdown the cell left shows: marks, link allowlist with `javascript:`, `data:` and protocol-relative `//host` targets left without href, backslash escapes, `<br>`, no emphasis inside a word such as `snake_case_name` or around spaces such as `2 * 3 * 4`, HTML never parsed).
- Criteria: the inline marks of the cell left, no render requested and no final save posted; a cell whose text was not changed keeps its rendering.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TABLE-006](../../strs/table-editing/StRS-MDOKFSTUDIO-TABLE-006.md): Tab, arrows and editing keys work in a table cell
- Supersedes:
  - [SwRS-MDOKFSTUDIO-TABLE-035](SwRS-MDOKFSTUDIO-TABLE-035.md): Tab and the arrow keys move through the table cells
<!-- okf:links:end -->
