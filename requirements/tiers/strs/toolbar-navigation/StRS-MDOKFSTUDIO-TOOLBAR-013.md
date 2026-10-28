---
type: StRS
id: StRS-MDOKFSTUDIO-TOOLBAR-013
uuid: 0fc6a6e5-1fd4-490c-ab82-fd7e9571abb1
title: The reader decides how the panes scroll together and sees the cursor
  block
description: When a reader presses the Anchor button, the Studio SHALL switch,
  for that preview panel, whether the preview and the text editor scroll
  together, and when the reader turns on the setting that marks the editor
  selection, outline in the preview the block that matches the text editor's
  cursor line.
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I choose per preview panel whether scrolling the text
  editor scrolls the preview, the button tells me when there is no text editor
  to follow, and I see in the preview which block I am working on in the text
  editor, even when the preview does not follow the editor's scroll.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
- SwRS-MDOKFSTUDIO-TOOLBAR-120
- SwRS-MDOKFSTUDIO-TOOLBAR-122
- SwRS-MDOKFSTUDIO-TOOLBAR-126
- SwRS-MDOKFSTUDIO-TOOLBAR-128
default_owner_email: gaetan@xeberon.net
---

## The reader decides how the panes scroll together and sees the cursor block

### Normative behavior

When a reader presses the Anchor button, the Studio SHALL switch, for that preview panel, whether the preview and the text editor scroll together, and when the reader turns on the setting that marks the editor selection, outline in the preview the block that matches the text editor's cursor line.

### Preserved stakeholder intent

As a reader, I choose per preview panel whether scrolling the text editor scrolls the preview, the button tells me when there is no text editor to follow, and I see in the preview which block I am working on in the text editor, even when the preview does not follow the editor's scroll.

### Rationale and constraints

- The first scroll mode comes from the setting `markdownOkfSchemaStudio.preview.scrollPreviewWithEditor`; the button overrides it for the panel.
- The button is disabled and never looks pressed while no text editor shows the file.
- The cursor mark is controlled by the setting `markdownOkfSchemaStudio.preview.markEditorSelection`, off by default.
- The mark goes to the block that contains the cursor line.
- The mark is refreshed when the editor scrolls or the preview is rendered again, not on every cursor move.
