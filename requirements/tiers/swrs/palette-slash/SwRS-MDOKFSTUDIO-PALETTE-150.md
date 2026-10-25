---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-150
uuid: 70130425-9704-45c8-92b9-e57c3bec543e
title: Figure writes a figure directive for a picked image
description: "When the host answers a path for the Figure button outside a figure,
  the extension SHALL write a figure directive with that path, the option :alt: set
  to the file name without extension and the touched lines, or an empty line, as the
  caption."
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-007
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-039
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/editorChrome.ts
- src/page/modules/blockEditActions.ts
- src/page/modules/editPalette.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/runtimePaletteActions.test.ts
---

## Figure writes a figure directive for a picked image

### Normative behavior

When the host answers a path for the Figure button outside a figure, the extension SHALL write a figure directive with that path, the option :alt: set to the file name without extension and the touched lines, or an empty line, as the caption.

### Scenario (nominal): Picked image

- GIVEN the path pics/cat.png picked and the caret after Intro
- WHEN the action runs
- THEN a directive `:::{figure} pics/cat.png` with `:alt: cat` and an empty caption line is inserted after a blank line, with the caret on the caption line

### Scenario (nominal): Selection becomes the caption

- GIVEN the selected line A cat
- WHEN Figure runs with a picked path
- THEN the touched lines are the caption inside the directive

### Scenario (boundary): Fence and path

| Input | Outcome |
| --- | --- |
| a selection that holds a fence of three colons | the outer fence has four colons (one colon more than the longest colon fence in the touched lines) |
| a selection without a colon fence | the outer fence has three colons (never shorter than three) |
| the path pics/cat.png | written as picked, with no angle brackets |

### Scenario (refusal): Missing path

- GIVEN no path
- WHEN the action runs
- THEN no edit is produced

### Scenario (boundary): Where Figure opens a dialog or the form

| Input | Outcome |
| --- | --- |
| the caret in a plain paragraph | the image dialog is requested (see SwRS-MDOKFSTUDIO-PALETTE-192) |
| the caret inside a figure directive, or in a Markdown image alone in its paragraph | the figure form opens and no dialog is requested (see SwRS-MDOKFSTUDIO-PALETTE-153) |
| the caret in nested figures | the deepest directive that holds the caret wins |

### Scenario (nominal): Browse in the figure form

- GIVEN the figure form open
- WHEN Browse is pressed and the host answers a path
- THEN the editor stays open, the Source field holds the path and has the focus

### Scenario (refusal): Browse refused

- GIVEN the host refuses the pick
- WHEN the answer arrives
- THEN the Source field is unchanged and the reason is shown in the status line; an answer that arrives after the form closed is ignored

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-192: the host image picker that answers the path.
- SwRS-MDOKFSTUDIO-PALETTE-153: the figure form.

### Verification notes

- Method: test/page/modules/editActions.test.ts, with its markers in test/page/modules/editActions.test.ts (T31: figure inserts the directive with alt text and an empty caption line; figure keeps the touched lines as the caption and uses one more colon than the fences inside; checks the picked image, selection, fence and missing path scenarios)
- Method: test/page/runtimePaletteActions.test.ts (T32: the Figure button with the caret inside a figure opens the form, not the file dialog; the Figure button outside any figure still picks an image; Browse asks the host for an image, keeps the editor open, and fills Source; checks the where-Figure-opens and Browse scenarios)
- Criteria: The path is written as picked, with no angle brackets; the outer fence is never shorter than three colons.
