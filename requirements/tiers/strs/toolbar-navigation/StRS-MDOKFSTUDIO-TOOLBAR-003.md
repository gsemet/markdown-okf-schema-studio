---
type: StRS
id: StRS-MDOKFSTUDIO-TOOLBAR-003
uuid: b143916d-7bf0-491a-91ca-db88ebd5f813
title: The reader finds and replaces text in the preview
description: The preview SHALL let the reader find text in the rendered page and
  replace it in the document, without leaving the preview.
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: draft
status: draft
origin: native
tier: StRS
derives_from: []
user_need: Readers and editors of a long document want to locate a word or
  phrase in what they read, see every occurrence, and change it in the document
  without switching to the text editor, with the rest of the file left as it is.
derived_by:
- SwRS-MDOKFSTUDIO-TOOLBAR-009
- SwRS-MDOKFSTUDIO-TOOLBAR-010
- SwRS-MDOKFSTUDIO-TOOLBAR-011
- SwRS-MDOKFSTUDIO-TOOLBAR-012
- SwRS-MDOKFSTUDIO-TOOLBAR-014
- SwRS-MDOKFSTUDIO-TOOLBAR-131
default_owner_email: gaetan@xeberon.net
---

## The reader finds and replaces text in the preview

### Normative behavior

The preview SHALL let the reader find text in the rendered page and replace it in the document, without leaving the preview.

### Preserved stakeholder intent

## User Need

Readers and editors of a long document want to locate a word or phrase in what they read, see every occurrence, and change it in the document without switching to the text editor, with the rest of the file left as it is.

### Rationale and constraints

- The search runs on the text the reader sees: tables, admonitions and folded sections included, never the hidden source.
- A replacement edits only the matched source spans and is one undo step; a match that does not map one-to-one to the source (a formula, a link target, generated text) is left alone and counted.
- A read-only preview finds but never replaces. Cmd/Ctrl+F in the text editor keeps VS Code's own find.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-TOOLBAR-009](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-009.md): Cmd/Ctrl+F opens a find bar over the preview
  - [SwRS-MDOKFSTUDIO-TOOLBAR-010](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-010.md): The find bar paints the matches of the rendered text and walks them
  - [SwRS-MDOKFSTUDIO-TOOLBAR-011](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-011.md): The find bar matches case, whole words and regular expressions
  - [SwRS-MDOKFSTUDIO-TOOLBAR-012](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-012.md): Replace edits only the matched source spans
  - [SwRS-MDOKFSTUDIO-TOOLBAR-014](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-014.md): Replace is unavailable in a read-only preview
  - [SwRS-MDOKFSTUDIO-TOOLBAR-131](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-131.md): Replace all announces the matches it will skip
<!-- okf:links:end -->
