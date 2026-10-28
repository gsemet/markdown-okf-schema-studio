---
type: StRS
id: StRS-MDOKFSTUDIO-BLOCK-011
uuid: bc2f36af-c3a3-45a9-b0d4-f36307664d3c
title: A writer adds blocks and starts an empty document from the preview
description: When a writer clicks the insert point after a block in edit mode,
  or opens the preview of a document with no body in edit mode and uses the
  Start writing button or the Enter key, the Studio SHALL open an empty editor
  at that place and insert the typed text as a new block with one blank line on
  each side.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I add a paragraph, a list or a heading between two
  blocks, or after the last one, and I open an empty file, or a file with only
  metadata, and start writing from the preview, without opening the text editor.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-087
- SwRS-MDOKFSTUDIO-BLOCK-094
- SwRS-MDOKFSTUDIO-BLOCK-102
- SwRS-MDOKFSTUDIO-BLOCK-253
default_owner_email: gaetan@xeberon.net
---

## A writer adds blocks and starts an empty document from the preview

### Normative behavior

When a writer clicks the insert point after a block in edit mode, or opens the preview of a document with no body in edit mode and uses the Start writing button or the Enter key, the Studio SHALL open an empty editor at that place and insert the typed text as a new block with one blank line on each side.

### Preserved stakeholder intent

Writers expect to extend a document from the preview, also after a figure or an image that ends the file.

Writers expect an empty document to be as easy to start as any other.

As a writer, I add a paragraph, a list or a heading between two blocks, or after the last one, and I open an empty file, or a file with only metadata, and start writing from the preview, without opening the text editor.

### Rationale and constraints

- Whitespace-only text inserts nothing and cancelling an inserted block removes it.
- A document with Windows line endings gets Windows line endings in the inserted text.
- The Start writing button is not offered when the render failed.
- Escape in the first editor brings the button back.
