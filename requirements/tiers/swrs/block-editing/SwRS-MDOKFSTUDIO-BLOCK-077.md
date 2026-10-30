---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-077
uuid: a461bbc8-ae89-4be1-b38c-8bd1bd12afff
title: Keys no editor handled still reach VS Code
description: When a keydown is not one an open editor handled, the page SHALL
  NOT stop its propagation.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-008
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## Keys no editor handled still reach VS Code

### Normative behavior

When a keydown is not one an open editor handled, the page SHALL NOT stop its propagation.

### Scenario: Ctrl+Tab

- GIVEN an editor with the focus
- WHEN the writer presses Ctrl+Tab
- THEN the key reaches VS Code and switches tabs

### Scenario: Composition

- GIVEN an Enter key during an IME composition
- WHEN it bubbles
- THEN the page does not stop it

### Verification notes

- Method: Unit test `CR 041: keys no editor handled keep reaching VS Code` in test/page/modules/editorKeys.test.ts.
- Criteria: isHandledEditorKey is false when defaultPrevented is not true, during composition and outside editors.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-008](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-008.md): A writer types and moves between blocks with text editor keys
<!-- okf:links:end -->
