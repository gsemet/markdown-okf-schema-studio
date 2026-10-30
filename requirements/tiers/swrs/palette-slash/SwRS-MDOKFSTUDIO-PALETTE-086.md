---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-086
uuid: c62be13a-a935-49ee-94a2-07303097975f
title: Cmd or Ctrl with the slash key matches the TODO shortcut on every
  platform
description: When the writer presses Cmd+/ or Ctrl+/, with or without Shift, in
  a block text box, the extension SHALL match the shortcut of the TODO action.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## Cmd or Ctrl with the slash key matches the TODO shortcut on every platform

### Normative behavior

When the writer presses Cmd+/ or Ctrl+/, with or without Shift, in a block text box, the extension SHALL match the shortcut of the TODO action.

### Scenario: Ctrl on macOS

- GIVEN a block editor on macOS
- WHEN the writer presses Ctrl+/
- THEN the TODO action is matched

### Scenario: Cmd on Windows

- GIVEN a block editor on Windows
- WHEN the writer presses Cmd+/
- THEN the TODO action is matched

### Verification notes

- Method: Unit test shortcutFor accepts Ctrl+/ and Cmd+/ on every platform in test/page/modules/editActions.test.ts; the TODO edit itself belongs to the review annotation requirements
- Criteria: The shortcut declares the modifier any and accepts Shift; the physical code is Slash and the typed key /.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
<!-- okf:links:end -->
