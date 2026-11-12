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
req_lifecycle: proposed
status: stable
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
default_owner_email: gaetan@xeberon.net
---

## The reader always sees the section being read

### Normative behavior

When a reader scrolls a document, the Studio SHALL keep the current heading and its parent headings pinned at the top of the preview without moving the text, as many levels as the reader set, between one and six.

### Preserved stakeholder intent

As a reader, I always know which section I am in while I scroll a long document, without the pinned headings shifting the text or hiding it, and I choose how much of the heading path stays visible, from the current heading alone up to six levels.

### Rationale and constraints

- The pinned headings show the heading at the reading line with its parents, written with their `#` markers.
- The band follows every heading level from h1 to h6 of the running text (not the headings inside admonitions and the properties table), keeps each level on one line, cut with an ellipsis, and leaves room for the toolbar.
- The depth is set by the setting `markdownOkfSchemaStudio.preview.stickyHeadingDepth`; its default is three levels.
- A depth outside one to six is brought back into range, and a value that is not a number means the default.

### Main paths

#### Path 1: Scroll and keep the section in view

1. The reader scrolls the document
   - SwRS-MDOKFSTUDIO-TOOLBAR-018: a heading lies at or above the reading line and the sticky band shows it with its parent headings, up to the depth setting
   - Option SwRS-MDOKFSTUDIO-TOOLBAR-018 (boundary): above the first heading the band is hidden
2. The band shows the current heading path
   - SwRS-MDOKFSTUDIO-TOOLBAR-002: text passes under the band and a soft shadow is drawn below it
   - Option SwRS-MDOKFSTUDIO-TOOLBAR-002 (boundary): at the top of the page no shadow is drawn
3. The current section stays pinned at the top

#### Path 2: Change the depth of the band

1. The band shows the current heading path
   - SwRS-MDOKFSTUDIO-TOOLBAR-022: the depth setting is changed while a preview is open, and the page is loaded again with the new depth
   - Option SwRS-MDOKFSTUDIO-TOOLBAR-022 (boundary): a value out of range or not a number is rounded, kept between 1 and 6, or replaced by 3
2. The band shows at most the configured number of lines

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-TOOLBAR-002](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-002.md): A soft shadow under the sticky heading band shows only while text scrolls under it
  - [SwRS-MDOKFSTUDIO-TOOLBAR-018](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-018.md): The sticky band shows the current heading path
  - [SwRS-MDOKFSTUDIO-TOOLBAR-022](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-022.md): The sticky heading depth setting decides how many levels stay pinned
  - [SwRS-MDOKFSTUDIO-TOOLBAR-025](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-025.md): The sticky band is fixed, aligned with the column and clear of the toolbar
  - [SwRS-MDOKFSTUDIO-TOOLBAR-030](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-030.md): The reading offset below the band settles without oscillation
<!-- okf:links:end -->
