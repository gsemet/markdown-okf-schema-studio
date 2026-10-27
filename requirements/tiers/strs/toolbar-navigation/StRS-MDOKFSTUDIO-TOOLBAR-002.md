---
type: StRS
id: StRS-MDOKFSTUDIO-TOOLBAR-002
uuid: 40ef4790-5b7d-44de-aaa6-7c511ad22096
title: The reader folds and unfolds the sections of the document
description: The preview SHALL let the reader fold a section of the document
  under its heading and unfold it again, one section at a time or all at once,
  without changing the document.
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: Readers of a long document want to hide the sections they are not
  reading and see the outline of the document, and to come back to the same
  folded view later, without the document being modified.
derived_by:
- SwRS-MDOKFSTUDIO-TOOLBAR-003
- SwRS-MDOKFSTUDIO-TOOLBAR-004
- SwRS-MDOKFSTUDIO-TOOLBAR-005
- SwRS-MDOKFSTUDIO-TOOLBAR-006
- SwRS-MDOKFSTUDIO-TOOLBAR-008
default_owner_email: gaetan@xeberon.net
---

## The reader folds and unfolds the sections of the document

### Normative behavior

The preview SHALL let the reader fold a section of the document under its heading and unfold it again, one section at a time or all at once, without changing the document.

### Preserved stakeholder intent

## User Need

Readers of a long document want to hide the sections they are not reading and see the outline of the document, and to come back to the same folded view later, without the document being modified.

### Rationale and constraints

- The fold state is a view state of the reader. It is kept for the document across reloads and never written to the file.
- Folding works in read mode and in edit mode; a block inside a folded section cannot be edited until the section is unfolded.
- Search in the preview and navigation to an anchor open the folded section that holds their target.
