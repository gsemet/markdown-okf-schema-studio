---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-160
uuid: 867eb5a8-db53-4aaf-9324-fe49bf48044c
title: Apply rewrites the figure directive in one minimal edit
description: When the writer applies the figure form with a change, the
  extension SHALL replace the directive with the rewritten one in one edit that
  keeps every untouched part byte for byte, and keep the editor open.
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
- src/page/modules/figureDirective.ts
tested_in_files:
- test/page/modules/figureDirective.test.ts
- test/page/runtimePaletteActions.test.ts
---

## Apply rewrites the figure directive in one minimal edit

### Normative behavior

When the writer applies the figure form with a change, the extension SHALL replace the directive with the rewritten one in one edit that keeps every untouched part byte for byte, and keep the editor open.

### Scenario (nominal): Change

- GIVEN a figure whose width is changed
- WHEN Apply is pressed
- THEN the directive is replaced in one edit and the editor stays open; the edit range is the whole directive found when the form opened

### Scenario (nominal): Conversion

- GIVEN a Markdown image converted to a figure
- WHEN Convert to figure is pressed
- THEN the image reference is replaced by the figure directive

### Scenario (boundary): No change

| Input | Outcome |
| --- | --- |
| an untouched form, Apply pressed | the text is not written (no edit event, the document version does not move) and the focus returns to the text box with its selection |
| a changed width, Apply pressed | the directive is written |

### Scenario (boundary): Untouched parts are written back byte for byte

| Input | Outcome |
| --- | --- |
| a figure with unknown options and unusual spacing, only the width changed | only the width line is rewritten and the unknown options stay in their order |
| a figure written with a backtick or tilde fence | the fence style and the indentation are kept |
| a caption and a legend that were not edited | the original body is kept |
| an edited caption or legend | the edited text replaces the original body |
| an unmodified model | serialising it gives the original text |
| an option whose value did not change | its original line is kept |
| an unknown option with an empty value | never dropped |

### Scenario (boundary): Options written

| Input | Outcome |
| --- | --- |
| the Width field emptied | the width line is gone (the options alt, width, align and name are dropped when empty) |
| a figure with no option and a caption, a width typed | the option line is added after the unknown ones and a blank line stays before the caption |
| options that are new | appended after the unknown options |

### Scenario (boundary): Caption, legend and outer fence

| Input | Outcome |
| --- | --- |
| a caption and a legend that were edited | the body is the caption, a blank line and the legend (two paragraphs) |
| a legend that holds a fence of three colons | the outer fence has four colons (one character more than a fence in the caption or legend that is as long as the outer fence) |
| a legend with a shorter fence | the outer fence is unchanged |
| any outer fence | the fence character of the directive is kept |

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-153: the figure form that is applied.

### Verification notes

- Method: test/page/runtimePaletteActions.test.ts (T32: Apply rewrites the directive in one edit and keeps untouched options byte for byte; a Markdown image alone in its paragraph converts to a figure; Apply without a change writes nothing; checks the change, conversion and no change scenarios)
- Method: test/page/modules/figureDirective.test.ts (T32: a book-style figure round-trips byte for byte; backtick and tilde fences keep their style; unusual spacing is read and written back unchanged when nothing changes; changing the width rewrites only that line and keeps unknown options in order; empty known options are dropped and new ones are appended after the unknown ones; adding the first option to a figure without options keeps a blank line before the caption; caption and legend are edited as separate paragraphs; a fence inside the legend makes the outer fence longer; checks the untouched parts, options and caption, legend and outer fence scenarios)
- Criteria: Serialising an unmodified model gives the original text; unknown options are never dropped, even with an empty value; an edited caption or legend replaces the original body, otherwise the original body is kept.
