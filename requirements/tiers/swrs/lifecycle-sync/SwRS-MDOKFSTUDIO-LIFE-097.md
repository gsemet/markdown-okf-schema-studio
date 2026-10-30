---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-097
uuid: adc33c62-98f0-438d-be82-c9d18d7bdf92
title: Two settings decide how the panes follow each other
description: When the text editor is scrolled or a block of the preview is
  scrolled to or clicked, the extension SHALL move the other pane only as far as
  markdownOkfSchemaStudio.preview.scrollPreviewWithEditor (boolean, on by
  default) and markdownOkfSchemaStudio.preview.scrollEditorWithPreview (boolean,
  on by default) allow.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-010
- StRS-MDOKFSTUDIO-LIFE-021
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/scrollCore.ts
- src/session/features/scrollSync.ts
tested_in_files:
- test/integration/sourceMapping.test.ts
- test/page/pageSettings.test.ts
- test/page/runtimeScroll.test.ts
default_owner_email: gaetan@xeberon.net
---

## Two settings decide how the panes follow each other

### Normative behavior

When the text editor is scrolled or a block of the preview is scrolled to or clicked, the extension SHALL move the other pane only as far as markdownOkfSchemaStudio.preview.scrollPreviewWithEditor (boolean, on by default) and markdownOkfSchemaStudio.preview.scrollEditorWithPreview (boolean, on by default) allow.

### Scenario (nominal): The preview follows the editor

- GIVEN markdownOkfSchemaStudio.preview.scrollPreviewWithEditor is on
- WHEN the writer scrolls the text editor
- THEN the extension scrolls the preview to the place the text editor scrolls to

### Scenario (boundary): Defaults

| Input | Outcome |
| --- | --- |
| No stored value for scrollPreviewWithEditor, settings and page boot context read | The setting is true; a boot entry that is absent or not false reads as on |
| No stored value for scrollEditorWithPreview, preview settings read | The setting is true |

### Scenario (refusal): The preview does not follow the editor

- GIVEN scrollPreviewWithEditor set to false
- WHEN the writer scrolls the text editor
- THEN the preview stays where it is; the Anchor button overrides the setting for one panel

### Scenario (refusal): The preview never moves the editor

- GIVEN scrollEditorWithPreview set to false
- WHEN the reader scrolls or clicks in the preview
- THEN the editor does not move

### Scenario (nominal): A click reveals the source

- GIVEN scrollEditorWithPreview on and the reader clicks a paragraph outside edit mode
- WHEN the event fires
- THEN the page posts previewReveal with activation click and the host reveals the line

### Scenario (boundary): A double click

| Input | Outcome |
| --- | --- |
| The reader double-clicks rendered content outside edit mode | The page posts nothing beyond the reveals of its two clicks; there is no double-click setting (a doubleClickToSwitchToEditor value left in the user settings is not a setting of the extension and has no effect) |

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-071: a change of these settings replaces the page document

### Verification notes

- Method: test/core/configuration/settingsRegistry.test.ts (Defaults): "the page reads missing or odd boot entries with the page defaults".
- Method: test/page/pageSettings.test.ts (Defaults): "page settings default to following both ways, without selection marks or double-click reveal".
- Method: test/page/runtimeScroll.test.ts (The preview does not follow the editor, The preview never moves the editor, A double click reveals the source): "disabling editor anchoring stops preview-to-editor scrolling", "executes source and preview synchronization across layout changes" (a click posts previewReveal; a dblclick posts nothing more). The click path with scrollEditorWithPreview off has no test (untested); checked by reading revealFromPage and revealEditorLine.
- Method: test/integration/sourceMapping.test.ts (A click reveals the source): a previewReveal with activation click reaches the host and the editor line is revealed.
- Criteria: readPreviewConfiguration returns true for no value of the first two settings; the host posts sourceScroll only with the setting or the mark on; revealEditorLine returns before any reveal when scrollEditorWithPreview is false; the page registers no double-click listener.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-010](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-010.md): The panes scroll together and the reading position survives updates
  - [StRS-MDOKFSTUDIO-LIFE-021](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-021.md): The settings editor lists the Studio settings in clear groups
<!-- okf:links:end -->
