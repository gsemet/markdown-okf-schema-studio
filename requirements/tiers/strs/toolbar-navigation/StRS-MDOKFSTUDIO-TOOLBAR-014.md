---
type: StRS
id: StRS-MDOKFSTUDIO-TOOLBAR-014
uuid: b081c864-826c-41e6-bed1-6de93d57c508
title: A writer shares one page as a self-contained HTML file
description: When a writer exports a preview page, the Studio SHALL save that
  page as one self-contained HTML file that a reader with no editor opens in a
  browser.
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I send a rendered page, with its theme, diagrams and
  properties, to a reader who has no editor, as one file that needs nothing else
  to open.
derived_by:
- SwRS-MDOKFSTUDIO-DIAG-128
- SwRS-MDOKFSTUDIO-FMSCHEMA-091
- SwRS-MDOKFSTUDIO-TOOLBAR-134
- SwRS-MDOKFSTUDIO-TOOLBAR-135
- SwRS-MDOKFSTUDIO-TOOLBAR-136
- SwRS-MDOKFSTUDIO-TOOLBAR-137
default_owner_email: gaetan@xeberon.net
---

## A writer shares one page as a self-contained HTML file

### Normative behavior

When a writer exports a preview page, the Studio SHALL save that page as one self-contained HTML file that a reader with no editor opens in a browser.

### Preserved stakeholder intent

## User Need

As a writer, I send a rendered page, with its theme, diagrams and properties, to a reader who has no editor, as one file that needs nothing else to open.

### Rationale and constraints

- The file keeps the preview's theme and width at 100 % zoom; the zoom is not kept.
- Review comments and editing controls are not part of the file.
- Links to other files cannot work for the reader, so they are removed after a warning.
- Export is available in Restricted Mode: it reads only what the preview already shows.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-DIAG-128](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-128.md): Exported diagrams are drawn images in the theme of the file
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-091](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-091.md): The exported properties table opens on a click
  - [SwRS-MDOKFSTUDIO-TOOLBAR-134](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-134.md): Export to HTML is a command and a toolbar button that save one file
  - [SwRS-MDOKFSTUDIO-TOOLBAR-135](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-135.md): Export removes links to other files after a warning
  - [SwRS-MDOKFSTUDIO-TOOLBAR-136](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-136.md): The exported file is self-contained and needs no script
  - [SwRS-MDOKFSTUDIO-TOOLBAR-137](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-137.md): The exported page shows the content without comments or editing controls
<!-- okf:links:end -->
