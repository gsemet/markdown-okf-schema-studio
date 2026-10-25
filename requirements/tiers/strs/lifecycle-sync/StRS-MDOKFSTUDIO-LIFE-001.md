---
type: StRS
id: StRS-MDOKFSTUDIO-LIFE-001
uuid: 92d5f773-779e-44b1-acad-85657c0e0dbc
title: A writer opens previews beside the editor or as tabs, beside the built-in
  preview
description: When a writer or reader asks for a preview of a Markdown file, the
  Studio SHALL show its rendered preview in the editor group beside the text
  editor, or as a tab that stays on the file for the Open With choice, while
  leaving the built-in Markdown preview, its commands and its settings
  untouched.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I open a rendered preview of the Markdown file I am
  editing beside the editor, from the command palette, the Explorer, the editor
  title or a keyboard shortcut; as a reader, I open a Markdown file straight as
  a preview in its own tab, without changing the editor that Markdown files open
  in by default, and I keep the built-in Markdown preview next to it without
  either breaking the other.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-001
- SwRS-MDOKFSTUDIO-LIFE-003
- SwRS-MDOKFSTUDIO-LIFE-010
- SwRS-MDOKFSTUDIO-LIFE-018
- SwRS-MDOKFSTUDIO-LIFE-026
- SwRS-MDOKFSTUDIO-LIFE-032
- SwRS-MDOKFSTUDIO-LIFE-038
- SwRS-MDOKFSTUDIO-LIFE-049
- SwRS-MDOKFSTUDIO-LIFE-127
- SwRS-MDOKFSTUDIO-LIFE-149
- SwRS-MDOKFSTUDIO-LIFE-151
- SwRS-MDOKFSTUDIO-LIFE-156
- SwRS-MDOKFSTUDIO-TRUST-072
---

## A writer opens previews beside the editor or as tabs, beside the built-in preview

### Normative behavior

When a writer or reader asks for a preview of a Markdown file, the Studio SHALL show its rendered preview in the editor group beside the text editor, or as a tab that stays on the file for the Open With choice, while leaving the built-in Markdown preview, its commands and its settings untouched.

### Preserved stakeholder intent

As a writer, I open a rendered preview of the Markdown file I am editing beside the editor, from the command palette, the Explorer, the editor title or a keyboard shortcut; as a reader, I open a Markdown file straight as a preview in its own tab, without changing the editor that Markdown files open in by default, and I keep the built-in Markdown preview next to it without either breaking the other.

### Rationale and constraints

- Asking again for a preview reuses the preview that is already open instead of opening a second one.
- A file that is not a saved Markdown file gets an explanation instead of a preview.
- The Studio is never the default editor of Markdown files; the reader opts in for each file.
- The tab opens at once and fills in when the render ends.
- The Studio changes none of the built-in settings.
- Files that a reader opens while the side preview has focus are shown in another editor group than the preview, so the preview is not replaced by them.
- Closing the preview releases the group it locked, but never a group that holds anything else.
- Several previews can be open at once, the side preview and one or more Open With tabs; each keeps its own state, render and file watching, and shows its own document and its own place.
- Refresh Preview acts on one preview, the newest one still open.
