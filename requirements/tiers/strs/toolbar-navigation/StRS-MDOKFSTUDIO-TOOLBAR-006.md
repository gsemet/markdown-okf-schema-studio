---
type: StRS
id: StRS-MDOKFSTUDIO-TOOLBAR-006
uuid: 92527f9b-0a65-4ae0-981f-3fd94a6c6ccc
title: The reader uses a table of contents beside the document
description: When a reader presses the Table of contents button, the Studio
  SHALL show or hide a column that lists the document's headings, mark the
  section being read, let the reader fold sections and jump to a heading, and
  keep the text, the tables and the pinned headings clear of the column.
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I open a table of contents next to a long document when
  I want an overview and close it when I want the room, the preview remembers my
  choice, I see in the table of contents where I am, fold the sections I do not
  need, click a heading to go there without leaving the document, and read the
  document and the table of contents side by side without either hiding part of
  the other.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
- SwRS-MDOKFSTUDIO-TOOLBAR-025
- SwRS-MDOKFSTUDIO-TOOLBAR-033
- SwRS-MDOKFSTUDIO-TOOLBAR-037
- SwRS-MDOKFSTUDIO-TOOLBAR-040
- SwRS-MDOKFSTUDIO-TOOLBAR-045
---

## The reader uses a table of contents beside the document

### Normative behavior

When a reader presses the Table of contents button, the Studio SHALL show or hide a column that lists the document's headings, mark the section being read, let the reader fold sections and jump to a heading, and keep the text, the tables and the pinned headings clear of the column.

### Preserved stakeholder intent

As a reader, I open a table of contents next to a long document when I want an overview and close it when I want the room, the preview remembers my choice, I see in the table of contents where I am, fold the sections I do not need, click a heading to go there without leaving the document, and read the document and the table of contents side by side without either hiding part of the other.

### Rationale and constraints

- The column is off by default; a stored workspace choice opens it; the state of a restored panel wins.
- On a narrow pane the column is hidden while the button stays pressed, and the text keeps its width.
- Entries are indented by heading level; the column lists h1 to h4 and says "No headings" for an empty document; headings inside admonitions and the properties table are not listed.
- The folded sections are remembered for the panel; the current section stays visible in the column.
- The text stays clear of the column in Margin, Auto and Full width mode and at the highest zoom, with no sideways scrolling of the page.
- The column starts below the toolbar and stays inside the pane.
- The pane width at which the column appears is specified in the software requirements.
