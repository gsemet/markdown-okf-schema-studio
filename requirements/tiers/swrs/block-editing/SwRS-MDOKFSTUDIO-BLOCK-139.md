---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-139
uuid: dee21c5a-8868-4192-a800-1aeff425d405
title: The chord is Cmd+Alt on macOS and Ctrl+Alt elsewhere
description: When a writer presses an arrow key with Cmd+Alt on macOS, or with
  Ctrl+Alt elsewhere, in the text box of a block editor, the page SHALL read it
  as the move chord.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-014
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## The chord is Cmd+Alt on macOS and Ctrl+Alt elsewhere

### Normative behavior

When a writer presses an arrow key with Cmd+Alt on macOS, or with Ctrl+Alt elsewhere, in the text box of a block editor, the page SHALL read it as the move chord.

### Scenario: macOS

- GIVEN a page on macOS
- WHEN the writer presses Cmd+Alt+ArrowDown in the text box
- THEN the chord is handled; Ctrl+Alt+ArrowDown is not

### Scenario: Windows or Linux

- GIVEN a page elsewhere
- WHEN the writer presses Ctrl+Alt+ArrowDown
- THEN the chord is handled

### Verification notes

- Method: Unit test `T37: on macOS the chord is Cmd+Alt, and Ctrl+Alt does nothing special` in test/page/runtimeBlockMoves.test.ts.
- Criteria: moveChordDirection depends on isApplePlatform.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-014](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-014.md): A writer reorders blocks with arrows, keys and selections
<!-- okf:links:end -->
