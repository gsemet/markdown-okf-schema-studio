---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-272
uuid: df607535-523e-4daf-a0e2-165a9f88629c
title: The raw copy takes over a native selection except where the browser's
  copy must stay
description: When the writer copies a non-empty native selection in read or edit
  mode, the page SHALL take the copy and leave it to the browser when the
  selection or the focus is in a text control, a block selection is active in
  edit mode, the page holds no source text for its render, the selection lies
  only in interface chrome, or an edge lies in an old-side card; an edge that
  cannot be placed snaps to its element (SwRS-MDOKFSTUDIO-BLOCK-286).
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-027
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/rawCopy.ts
tested_in_files:
- test/integration/realInput/rawCopy.ts
- test/page/runtimeRawCopy.test.ts
- test/visual/capture_raw_copy.py
default_owner_email: gaetan@xeberon.net
---

## The raw copy takes over a native selection except where the browser's copy must stay

### Normative behavior

When the writer copies a non-empty native selection in read or edit mode, the page SHALL take the copy and leave it to the browser when the selection or the focus is in a text control, a block selection is active in edit mode, the page holds no source text for its render, the selection lies only in interface chrome, or an edge lies in an old-side card; an edge that cannot be placed snaps to its element (SwRS-MDOKFSTUDIO-BLOCK-286).

### Scenario: nominal

- GIVEN source text of the shown render and a native text selection outside any text control
- WHEN the reader presses the copy chord
- THEN the page cancels the native copy and takes it as a raw copy, in read and edit mode

### Scenario: boundary

- GIVEN no source text, a collapsed selection, a text control, an active block selection, or a selection only in chrome
- WHEN the reader presses the copy chord
- THEN the browser's native copy runs

### Verification notes

- Method: unit tests of the page; real VS Code input test
- Criteria: each native case leaves the clipboard to the browser

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-027](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-027.md): A reader copies a selection as the exact Markdown under it
<!-- okf:links:end -->
