---
type: StRS
id: StRS-MDOKFSTUDIO-TOOLBAR-004
uuid: 1ab8c705-1190-475c-bc2c-77bdfffb3964
title: The reader always sees the section being read
description: When a reader scrolls a document, the Studio SHALL keep the current
  heading and its parent headings pinned at the top of the preview without
  moving the text, as many levels as the reader set, between one and six.
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I always know which section I am in while I scroll a
  long document, without the pinned headings shifting the text or hiding it, and
  I choose how much of the heading path stays visible, from the current heading
  alone up to six levels.
derived_by:
- SwRS-MDOKFSTUDIO-TOOLBAR-002
- SwRS-MDOKFSTUDIO-TOOLBAR-018
- SwRS-MDOKFSTUDIO-TOOLBAR-022
- SwRS-MDOKFSTUDIO-TOOLBAR-025
- SwRS-MDOKFSTUDIO-TOOLBAR-030
---

## The reader always sees the section being read

### Normative behavior

When a reader scrolls a document, the Studio SHALL keep the current heading and its parent headings pinned at the top of the preview without moving the text, as many levels as the reader set, between one and six.

### Preserved stakeholder intent

As a reader, I always know which section I am in while I scroll a long document, without the pinned headings shifting the text or hiding it, and I choose how much of the heading path stays visible, from the current heading alone up to six levels.

### Rationale and constraints

- The pinned headings show the heading at the reading line with its parents, written with their `#` markers.
- The band follows every heading level from h1 to h6 of the running text (not the headings inside admonitions and the properties table), wraps in a narrow pane and leaves room for the toolbar.
- The depth is set by the setting `markdownOkfSchemaStudio.preview.stickyHeadingDepth`; its default is three levels.
- A depth outside one to six is brought back into range, and a value that is not a number means the default.
