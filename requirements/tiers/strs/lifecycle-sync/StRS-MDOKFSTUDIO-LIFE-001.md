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
req_lifecycle: proposed
status: stable
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
- SwRS-MDOKFSTUDIO-LIFE-171
- SwRS-MDOKFSTUDIO-TRUST-072
default_owner_email: gaetan@xeberon.net
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-LIFE-001](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-001.md): The extension activates only on its own entry points
  - [SwRS-MDOKFSTUDIO-LIFE-003](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-003.md): Open Preview to Side opens or reveals a side preview
  - [SwRS-MDOKFSTUDIO-LIFE-010](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-010.md): Open Preview to Side checks the file it is given
  - [SwRS-MDOKFSTUDIO-LIFE-018](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-018.md): The Open With editor shows its own Markdown file
  - [SwRS-MDOKFSTUDIO-LIFE-026](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-026.md): The side preview follows the active Markdown editor
  - [SwRS-MDOKFSTUDIO-LIFE-032](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-032.md): Refresh Preview renders the shown document again
  - [SwRS-MDOKFSTUDIO-LIFE-038](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-038.md): Each preview has its own state and only the newest follows
  - [SwRS-MDOKFSTUDIO-LIFE-049](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-049.md): The status names the render state and shows pending, failed and recovered notices
  - [SwRS-MDOKFSTUDIO-LIFE-127](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-127.md): A restored panel reopens its document or explains why it cannot
  - [SwRS-MDOKFSTUDIO-LIFE-149](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-149.md): The Studio runs beside the built-in Markdown preview
  - [SwRS-MDOKFSTUDIO-LIFE-151](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-151.md): A side preview locks its editor group
  - [SwRS-MDOKFSTUDIO-LIFE-156](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-156.md): The settings editor lists the Studio settings in titled groups
  - [SwRS-MDOKFSTUDIO-LIFE-171](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-171.md): The manifest declares Agents window support
  - [SwRS-MDOKFSTUDIO-TRUST-072](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-072.md): The extension contributes no language, grammar or editors entry
<!-- okf:links:end -->
