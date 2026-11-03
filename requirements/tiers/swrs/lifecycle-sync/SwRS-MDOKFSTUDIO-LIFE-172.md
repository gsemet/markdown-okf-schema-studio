---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-172
uuid: 1936f6fb-193d-4705-95c6-c1885473a447
title: A document opens in preview mode and E switches to edit mode
description: 'When a document opens in a panel, the extension SHALL start the page
  in preview mode, unless the saved state of that same document holds edit mode, and
  while the page is in preview mode the extension SHALL switch to edit mode when E
  is pressed alone outside any text field.'
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/editMode.ts
- src/page/runtime.ts
tested_in_files:
- test/page/runtimeOpenInPreview.test.ts
default_owner_email: gaetan@xeberon.net
---

## A document opens in preview mode and E switches to edit mode

### Normative behavior

When a document opens in a panel, the extension SHALL start the page in preview mode, unless the saved state of that same document holds edit mode, and while the page is in preview mode the extension SHALL switch to edit mode when E is pressed alone outside any text field.

### Scenario (nominal): Another document replaces the one shown in the panel

- GIVEN a panel whose saved state names document A with edit mode on
- WHEN document B opens in the same panel
- THEN B starts in preview mode, whatever the stored workspace edit mode is

### Scenario (nominal): A fresh panel

- GIVEN a panel with no saved state and a workspace whose stored edit mode is true
- WHEN a document opens
- THEN the page starts in preview mode

### Scenario (boundary): The same document reloads

- GIVEN a panel whose saved state names the same document with edit mode on
- WHEN the page reloads
- THEN the page starts in edit mode (see SwRS-MDOKFSTUDIO-LIFE-170)

### Scenario (nominal): E switches to edit mode

- GIVEN a page in preview mode with a working Edit button
- WHEN E is pressed alone, with focus outside any text field
- THEN the page switches to edit mode as the Edit button does

### Scenario (boundary): E with a modifier or in a text field

- GIVEN a page in preview mode
- WHEN E is pressed with Ctrl, Cmd, Alt or Shift, or inside an input, a text area, a select or an editable element
- THEN the mode stays unchanged and the key is not intercepted

### Verification notes

- Method: page tests (`test/page/runtimeOpenInPreview.test.ts`).
- Criteria: the page starts in preview mode after a saved state of another document and in a fresh panel; the E key sets edit mode only as described.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-014](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-014.md): Previews come back after a reload, remember recent documents and leave nothing behind
<!-- okf:links:end -->
