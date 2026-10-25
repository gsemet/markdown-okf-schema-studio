---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-153
uuid: 65b441d4-7c9d-4659-ba1c-9edf96e7da99
title: The figure form edits the options of a figure and checks them
description: When the writer opens the figure form, from the Edit figure button
  over a hovered figure in edit mode or from Figure with the caret in a figure,
  the extension SHALL show a dialog with the fields Source, Alt text, Caption,
  Legend, Width, Align and Name, check them when the form is applied, and show
  each problem under its field while the form stays open and unchanged.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-007
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/editorChrome.ts
- src/page/modules/figureDirective.ts
- src/page/modules/figurePanel.ts
tested_in_files:
- test/integration/realInput.markers.ts
- test/page/modules/figureDirective.test.ts
- test/page/paletteReq.requirements.test.ts
- test/page/runtimePaletteActions.test.ts
---

## The figure form edits the options of a figure and checks them

### Normative behavior

When the writer opens the figure form, from the Edit figure button over a hovered figure in edit mode or from Figure with the caret in a figure, the extension SHALL show a dialog with the fields Source, Alt text, Caption, Legend, Width, Align and Name, check them when the form is applied, and show each problem under its field while the form stays open and unchanged.

### Scenario (nominal): Edit figure button

- GIVEN edit mode on and the pointer over a figure
- WHEN the writer presses Edit figure, shown at the top right of the figure
- THEN the block editor of the figure opens and, once its source arrives, the figure form; with the figure already being edited the form opens in the open editor

### Scenario (boundary): Edit figure button hidden

| Input | Outcome |
| --- | --- |
| edit mode off | the button is hidden |
| a scroll | the button is hidden |
| the pointer over another element | the button is hidden |
| a press on the button | the focus never moves |

The button is a child of the body placed with the CSSOM, so a content patch never removes it.

### Scenario (nominal): Fields of the form

- GIVEN the caret in a figure
- WHEN the form opens
- THEN the dialog is named Edit figure, the fields Source with a Browse... button, Alt text, Caption, Legend, Width with the placeholder 60% or 300px, Align with None, Left, Center and Right, and Name are filled from the directive, and the Source field has the focus with its text selected; the fields carry the accessible names Source, Alt text, Caption, Legend, Width, Align and Name

### Scenario (nominal): Lone Markdown image

- GIVEN the caret in an image alone in its paragraph
- WHEN the form opens
- THEN the dialog is named Convert image to figure, its submit button reads Convert to figure and has the focus

### Scenario (boundary): Directive found for the form

| Input | Outcome |
| --- | --- |
| a figure that holds another figure and the caret in the inner one | the inner directive is edited (the innermost figure that holds the caret) |
| the editor opened by Edit figure | the first figure of the text is edited |
| the caret in ![a](b.png) alone in its paragraph | the form converts that image |
| an image with other text in its paragraph | not a lone image, no figure |

### Scenario (boundary): Keys that apply the form

| Input | Outcome |
| --- | --- |
| Enter in a one-line field (for example Width) | the form is applied |
| Cmd+Enter or Ctrl+Enter anywhere in the form | the form is applied |
| Enter in Caption or Legend | a line break is typed and the form is not applied |
| Enter on a button | keeps its own effect |
| Enter during an IME composition | ignored |

### Scenario (refusal): Problems under the fields

| Input | Outcome |
| --- | --- |
| Width wide, applied | the message Use a number with px, %, em or rem, for example 60% or 300px. appears under Width (role alert), the field is aria-invalid and has the focus, the form stays open and the text is unchanged |
| widths 50, 50%, 12.5px, 3em, 2rem or an empty width | accepted, no problem reported (a non-negative number with an optional decimal part and the unit px, %, em, rem or none) |
| widths 50 %, -1px, 50pt, wide, 1.px | each refused with the width message |
| an empty Source | Choose or type the image path. under Source |
| a Source that is not on one line | The path is one line. |
| an Alt text that is not on one line | The alt text is one line. |
| a Name that is not on one line | The name is one line. |
| an Align that is not empty, left, center or right | Use left, center or right. |
| a Caption of more than one paragraph | The caption is one paragraph; put the others in the legend. |
| an empty Caption and a Legend | A legend needs a caption. under Legend |
| valid values | no message is shown and the directive is rewritten (see SwRS-MDOKFSTUDIO-PALETTE-160) |

When several fields are invalid the first invalid field gets the focus.

### Scenario (refusal): Figure that cannot be edited and stale submit

| Input | Outcome |
| --- | --- |
| the form asked for a figure whose first body line is --- (YAML option block) | the status line reads This figure uses a YAML option block: edit it in the text box. and the text is unchanged |
| the form asked with the caret in a plain paragraph | the status line reads No figure at the caret. |
| Apply pressed after the text of the text box changed from the text at the opening of the form (for example by a script) | the form closes and nothing is written |
| Apply pressed on the same text | the directive is written |

The range recorded at opening is never applied to a different text.

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-160: what Apply writes.
- SwRS-MDOKFSTUDIO-PALETTE-150: the Figure button and Browse.
- SwRS-MDOKFSTUDIO-MYST-031: the width pattern is the one the figure directive renderer uses.

### Verification notes

- Method: test/page/runtimePaletteActions.test.ts (T32: hovering a figure in edit mode shows Edit figure, outside edit mode it does not; Edit figure opens the block editor and, once the source arrives, the form; a Markdown image alone in its paragraph converts to a figure; an invalid width shows an inline error and keeps the form open without editing; checks the Edit figure, fields, lone image and problems scenarios)
- Method: test/page/modules/figureDirective.test.ts (T32: the width pattern matches the renderer's; locateFigure finds the directive around the caret, or the first one, and sees a Markdown image alone in its paragraph; a YAML option block and other directives are not parsed; the other validation messages are asserted as validate results only; checks the directive, width and problems scenarios)
- Method: test/integration/realInput.test.ts (scenarioFigureEditor, with its markers in test/integration/realInput.markers.ts; checks the fields and keys scenarios)
- Method: test/page/paletteReq.requirements.test.ts (a figure form submitted on a text that changed is closed without writing; checks the stale submit rows)
- Criteria: Only the width message is asserted by a panel test; the two status messages (YAML option block, No figure at the caret) are deduced from the code (openFigurePanel in src/page/features/editorChrome.ts) and not tested; parseFigure returns undefined for the YAML block and locateFigure returns undefined outside a figure or a lone image.
