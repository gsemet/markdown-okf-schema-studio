---
type: StRS
id: StRS-MDOKFSTUDIO-LIFE-010
uuid: d01c4567-6bd6-4a61-8877-fa513ab06ba6
title: The panes scroll together and the reading position survives updates
description: When a writer scrolls the text editor or a reader scrolls or clicks
  in the preview, the Studio SHALL bring the other pane to the same place in the
  document, as the scroll synchronization settings allow, and keep the preview
  on the same text when it updates, resizes or the text above it changes.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I scroll the source and the preview shows the same
  passage; as a reader, I scroll or click in the rendered text and the source
  editor shows where that text comes from; and I keep my place when images load,
  the pane is resized, the zoom changes or lines are added above me.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-026
- SwRS-MDOKFSTUDIO-LIFE-048
- SwRS-MDOKFSTUDIO-LIFE-069
- SwRS-MDOKFSTUDIO-LIFE-071
- SwRS-MDOKFSTUDIO-LIFE-097
- SwRS-MDOKFSTUDIO-LIFE-100
- SwRS-MDOKFSTUDIO-LIFE-108
- SwRS-MDOKFSTUDIO-LIFE-112
- SwRS-MDOKFSTUDIO-LIFE-116
- SwRS-MDOKFSTUDIO-LIFE-117
- SwRS-MDOKFSTUDIO-LIFE-119
- SwRS-MDOKFSTUDIO-LIFE-125
- SwRS-MDOKFSTUDIO-LIFE-156
---

## The panes scroll together and the reading position survives updates

### Normative behavior

When a writer scrolls the text editor or a reader scrolls or clicks in the preview, the Studio SHALL bring the other pane to the same place in the document, as the scroll synchronization settings allow, and keep the preview on the same text when it updates, resizes or the text above it changes.

### Preserved stakeholder intent

As a writer, I scroll the source and the preview shows the same passage; as a reader, I scroll or click in the rendered text and the source editor shows where that text comes from; and I keep my place when images load, the pane is resized, the zoom changes or lines are added above me.

### Rationale and constraints

- Both panes share one anchor, a source line, so a long paragraph maps to the right place.
- Moving the preview because of the editor never scrolls the editor back.
- Showing the source line for the preview happens without any editor being opened for it; nothing happens when no text editor shows the file.
- Scrolling in either pane never edits the document.
- While a block or field editor is open its screen position is the anchor.
- The reader chooses in the settings whether the preview follows the editor, whether the editor follows the preview and whether a double click jumps to the source.
- The Anchor button of the toolbar overrides the first choice for one panel.
- A change of these settings reloads the preview page.
