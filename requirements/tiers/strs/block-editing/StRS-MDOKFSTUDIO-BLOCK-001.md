---
type: StRS
id: StRS-MDOKFSTUDIO-BLOCK-001
uuid: 7224caa2-5c79-4b5c-ac7d-077856f7b9d9
title: A writer switches edit mode and finds it as left
description: When a writer clicks the Edit button of a writable preview, or
  opens a preview in a workspace where edit mode was last on, the Studio SHALL
  switch edit mode on or off, saving or closing what is open, and start that
  preview in edit mode unless it cannot edit the file.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I turn edit mode on to change my document in the preview
  and off to read it again, without losing anything I typed, and I reopen a
  document to find the preview in the edit mode I last chose, never offered
  editing in a preview that cannot change the file.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-001
- SwRS-MDOKFSTUDIO-BLOCK-012
- SwRS-MDOKFSTUDIO-BLOCK-236
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
- SwRS-MDOKFSTUDIO-TRUST-001
default_owner_email: gaetan@xeberon.net
---

## A writer switches edit mode and finds it as left

### Normative behavior

When a writer clicks the Edit button of a writable preview, or opens a preview in a workspace where edit mode was last on, the Studio SHALL switch edit mode on or off, saving or closing what is open, and start that preview in edit mode unless it cannot edit the file.

### Preserved stakeholder intent

Writers expect to change a document where they read it and to go back to plain reading with one click.

Writers expect the preview to remember whether they were editing, and not to promise editing where the file cannot be changed.

As a writer, I turn edit mode on to change my document in the preview and off to read it again, without losing anything I typed, and I reopen a document to find the preview in the edit mode I last chose, never offered editing in a preview that cannot change the file.

### Rationale and constraints

- Turning edit mode off saves the text of an open block editor and clears the block selection, the hover outline and the insert points.
- Turning edit mode on does not reflow the reading layout: paragraphs keep their wrapping and the text does not move.
- The choice is remembered per workspace; a preview that was already open and reloaded keeps its own state first.
- A preview of an untrusted workspace, or of a file outside every workspace folder, has no Edit button and never starts in edit mode.
