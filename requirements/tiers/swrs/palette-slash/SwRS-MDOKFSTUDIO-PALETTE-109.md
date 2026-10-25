---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-109
uuid: 4d43dbac-a3bb-41a5-a08e-e4f044b2c5f5
title: The Image button inserts or replaces an image reference
description: When the writer presses Image, the extension SHALL ask the host for
  a native image file dialog, keep the editor open while the dialog is shown,
  and insert or replace an image reference only when a valid path comes back.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-007
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/blockEditActions.ts
- src/page/modules/editPalette.ts
- src/page/modules/linkEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/editPalette.test.ts
- test/page/runtimePaletteActions.test.ts
---

## The Image button inserts or replaces an image reference

### Normative behavior

When the writer presses Image, the extension SHALL ask the host for a native image file dialog, keep the editor open while the dialog is shown, and insert or replace an image reference only when a valid path comes back.

### Scenario (nominal): Picked file

- GIVEN an open block editor and the path pics/cat.png
- WHEN the writer presses Image and the host answers the path
- THEN the text is ![cat](pics/cat.png) with cat selected, and the editor stayed open while the dialog had the focus

### Scenario (nominal): Image under the caret

| Input | Outcome |
| --- | --- |
| The caret in ![old](a.png "T") and b.png is picked | The text is ![old](b.png "T") with old selected; the whole image reference is replaced |
| The caret in ![](a.png) and b.png is picked | The alternative text is the new file name |

### Scenario (boundary): Name and path forms

| Input | Outcome |
| --- | --- |
| The path pics/cat.png | The path is written without angle brackets |
| The path my pics/a (1).png | The alternative text is a (1) and the path my pics/a (1).png is wrapped in angle brackets |
| A path with a blank, an opening parenthesis or a closing parenthesis | The path is written inside angle brackets |
| A path whose stem is empty after removing brackets | The alternative text is image |

### Scenario (refusal): Dialog without a path

- GIVEN the dialog is cancelled, fails, or the answer is stale
- WHEN the host answers
- THEN nothing is inserted and a refusal reason is shown in the status line; a cancel focuses the text box

### Scenario (refusal): Path refused

| Input | Outcome |
| --- | --- |
| The Image action without a path, or an empty path | No edit is produced |
| A path with a line break | No edit is produced |
| A path with a > character, or an angle bracket | No edit is produced; the Figure action shares the check |

### Known issues

- Known issue: after the editor has saved a change, the answer of the dialog is refused with the out-of-date reason (see SwRS-MDOKFSTUDIO-TRUST-065).

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-065: the gate that answers a stale pick with the out-of-date reason.
- SwRS-MDOKFSTUDIO-TRUST-090: the answer of each page request is matched by its id and result type.

### Verification notes

- Method: test/page/modules/editPalette.test.ts (T31: Image asks the host for an image file and inserts the reference; a failed pick inserts nothing; scenarios picked file, dialog without a path)
- Method: test/page/runtimePaletteActions.test.ts (T31: Image keeps the editor open while the file dialog has the focus, then inserts the reference; a stale image answer, a refusal and a cancel insert nothing; scenarios picked file, dialog without a path)
- Method: test/page/modules/editActions.test.ts (T31: image inserts ![name](path) with the name selected; image wraps a path with spaces or parentheses in angle brackets; image refuses a missing or unwritable path and keeps brackets out of the name; CR035: the image action replaces the image around the caret and keeps alt and title; CR035: imageDraft reads alt, path and title of the image around the caret; scenarios picked file, image under the caret, name and path forms, path refused)
- Criteria: The request is previewPickImage marked dialog; the name is the stem of the last path segment without the characters [, ] and backslash, trimmed; the wrapping test applies to whitespace, opening and closing parentheses; the replaced range is the whole image reference.
