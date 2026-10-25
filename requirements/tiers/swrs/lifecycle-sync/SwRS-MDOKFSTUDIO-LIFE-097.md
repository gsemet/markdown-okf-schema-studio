---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-097
uuid: adc33c62-98f0-438d-be82-c9d18d7bdf92
title: Three settings decide how the panes follow each other
description: When the text editor is scrolled or a block of the preview is
  scrolled to, clicked or double-clicked, the extension SHALL move the other
  pane only as far as markdownOkfSchemaStudio.preview.scrollPreviewWithEditor
  (boolean, on by default),
  markdownOkfSchemaStudio.preview.scrollEditorWithPreview (boolean, on by
  default) and markdownOkfSchemaStudio.preview.doubleClickToSwitchToEditor
  (boolean, off by default) allow.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
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
- src/page/features/pageInput.ts
- src/page/features/scrollCore.ts
- src/session/features/scrollSync.ts
tested_in_files:
- test/integration/sourceMapping.test.ts
- test/page/pageSettings.test.ts
- test/page/runtimeScroll.test.ts
---

## Three settings decide how the panes follow each other

### Normative behavior

When the text editor is scrolled or a block of the preview is scrolled to, clicked or double-clicked, the extension SHALL move the other pane only as far as markdownOkfSchemaStudio.preview.scrollPreviewWithEditor (boolean, on by default), markdownOkfSchemaStudio.preview.scrollEditorWithPreview (boolean, on by default) and markdownOkfSchemaStudio.preview.doubleClickToSwitchToEditor (boolean, off by default) allow.

### Scenario (nominal): The preview follows the editor

- GIVEN markdownOkfSchemaStudio.preview.scrollPreviewWithEditor is on
- WHEN the writer scrolls the text editor
- THEN the extension scrolls the preview to the place the text editor scrolls to

### Scenario (boundary): Defaults

| Input | Outcome |
| --- | --- |
| No stored value for scrollPreviewWithEditor, settings and page boot context read | The setting is true; a boot entry that is absent or not false reads as on |
| No stored value for scrollEditorWithPreview, preview settings read | The setting is true |
| No stored value for doubleClickToSwitchToEditor and a text editor of the file, settings read and a previewReveal with activation double-click reaches the host | The setting is false, the page posts no double-click reveal, and the host moves no editor |

### Scenario (refusal): The preview does not follow the editor

- GIVEN scrollPreviewWithEditor set to false
- WHEN the writer scrolls the text editor
- THEN the preview stays where it is; the Anchor button overrides the setting for one panel

### Scenario (refusal): The preview never moves the editor

- GIVEN scrollEditorWithPreview set to false
- WHEN the reader scrolls or clicks in the preview
- THEN the editor does not move and the double-click setting has no effect

### Scenario (nominal): A double click reveals the source

- GIVEN doubleClickToSwitchToEditor set to true and the reader double-clicks a paragraph outside edit mode
- WHEN the event fires
- THEN the page posts previewReveal with activation double-click and the host reveals the line

### Scenario (refusal): A double click that posts nothing

- GIVEN doubleClickToSwitchToEditor set to true
- WHEN the reader double-clicks a link, or double-clicks in edit mode
- THEN the page posts nothing

### Known issues

- Known issue: a single click already reveals the same line, because the host gates only the double-click activation on this setting, so turning the setting on adds no visible effect beyond the click.

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-071: a change of these settings replaces the page document

### Verification notes

- Method: test/core/configuration/settingsRegistry.test.ts (Defaults): "the page reads missing or odd boot entries with the page defaults".
- Method: test/page/pageSettings.test.ts (Defaults): "page settings default to following both ways, without selection marks or double-click reveal".
- Method: test/page/runtimeScroll.test.ts (The preview does not follow the editor, The preview never moves the editor, A double click reveals the source): "disabling editor anchoring stops preview-to-editor scrolling", "executes source and preview synchronization across layout changes" (dispatches a dblclick with the setting off, the activation stays click, and with it on, activation double-click). The click path with scrollEditorWithPreview off has no test (untested); checked by reading revealFromPage and revealEditorLine. A double click on a link or in edit mode is untested.
- Method: test/integration/sourceMapping.test.ts (Defaults, third row): double-click reveal with the setting off.
- Criteria: readPreviewConfiguration returns true for no value of the first two settings; the host posts sourceScroll only with the setting or the mark on; revealEditorLine returns before any reveal when scrollEditorWithPreview is false; the page and the host both check doubleClickToSwitchToEditor.
