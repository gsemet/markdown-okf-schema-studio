---
type: StRS
id: StRS-MDOKFSTUDIO-CODE-001
uuid: 90675ebe-7c19-40bb-af92-107409d27763
title: A reader reads highlighted, numbered and diff code
description: When a writer previews a document with a fenced code block, a diff
  or patch block or a MyST code directive, the Studio SHALL show the code
  literally, with syntax highlighting that follows the VS Code theme for a
  supported language, distinct treatments for added and deleted lines of a diff,
  and the line numbers, emphasized lines, file name and caption that a directive
  sets.
project: markdown-okf-schema-studio
scope: code-blocks
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: Writers need code samples to read as they would in published
  documentation, in the language and colours of their editor, and reviewers need
  to see at a glance what a change adds and removes.
derived_by:
- SwRS-MDOKFSTUDIO-CODE-001
- SwRS-MDOKFSTUDIO-CODE-002
- SwRS-MDOKFSTUDIO-CODE-003
- SwRS-MDOKFSTUDIO-CODE-004
- SwRS-MDOKFSTUDIO-CODE-005
- SwRS-MDOKFSTUDIO-CODE-006
- SwRS-MDOKFSTUDIO-CODE-007
- SwRS-MDOKFSTUDIO-CODE-008
- SwRS-MDOKFSTUDIO-CODE-009
- SwRS-MDOKFSTUDIO-CODE-010
- SwRS-MDOKFSTUDIO-CODE-011
- SwRS-MDOKFSTUDIO-CODE-012
- SwRS-MDOKFSTUDIO-CODE-013
- SwRS-MDOKFSTUDIO-CODE-014
- SwRS-MDOKFSTUDIO-CODE-015
- SwRS-MDOKFSTUDIO-CODE-016
- SwRS-MDOKFSTUDIO-CODE-028
- SwRS-MDOKFSTUDIO-CODE-030
- SwRS-MDOKFSTUDIO-CODE-031
- SwRS-MDOKFSTUDIO-CODE-036
- SwRS-MDOKFSTUDIO-CODE-037
- SwRS-MDOKFSTUDIO-CODE-038
- SwRS-MDOKFSTUDIO-CODE-039
- SwRS-MDOKFSTUDIO-CODE-040
- SwRS-MDOKFSTUDIO-CORE-028
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-CODE-002
- StRS-MDOKFSTUDIO-CODE-003
---

## A reader reads highlighted, numbered and diff code

### Normative behavior

When a writer previews a document with a fenced code block, a diff or patch block or a MyST code directive, the Studio SHALL show the code literally, with syntax highlighting that follows the VS Code theme for a supported language, distinct treatments for added and deleted lines of a diff, and the line numbers, emphasized lines, file name and caption that a directive sets.

### Preserved stakeholder intent

Writers need code samples to read as they would in published documentation, in the language and colours of their editor. Reviewers need to see what a change adds and removes at a glance, and authors need listings that point readers at specific lines and name their source.

### Rationale and constraints

- Unsupported languages stay plain monospace text; the shared language list is not documented in docs/user/editing.md.
- A diff is a visualization only: no comparison and no per-line navigation. The literal markers stay in the text.
- Line numbers, emphasized lines, file names and captions apply to MyST code directives; plain fences are covered by the highlighted code samples.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-CODE-001](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-001.md): Fenced code in a supported language is highlighted, other code stays literal
  - [SwRS-MDOKFSTUDIO-CODE-002](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-002.md): Resolve common fence labels to a supported grammar
  - [SwRS-MDOKFSTUDIO-CODE-003](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-003.md): Read the fence label case-insensitively up to its first separator
  - [SwRS-MDOKFSTUDIO-CODE-004](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-004.md): Leave unknown-language code as plain text
  - [SwRS-MDOKFSTUDIO-CODE-005](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-005.md): Numbered, emphasized and diff blocks are wrapped into lines
  - [SwRS-MDOKFSTUDIO-CODE-006](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-006.md): Show special characters once in highlighted code
  - [SwRS-MDOKFSTUDIO-CODE-007](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-007.md): Code blocks use one font scale, the theme colours and scroll long lines
  - [SwRS-MDOKFSTUDIO-CODE-008](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-008.md): Diff blocks show additions and deletions
  - [SwRS-MDOKFSTUDIO-CODE-009](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-009.md): Colour diff file header lines like ordinary lines
  - [SwRS-MDOKFSTUDIO-CODE-010](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-010.md): Use system colours for diff lines in forced-colours mode
  - [SwRS-MDOKFSTUDIO-CODE-011](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-011.md): Number and emphasize lines of MyST code directives
  - [SwRS-MDOKFSTUDIO-CODE-012](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-012.md): Style fenced code blocks with one font scale and the code background
  - [SwRS-MDOKFSTUDIO-CODE-013](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-013.md): Scroll long code lines inside their block
  - [SwRS-MDOKFSTUDIO-CODE-014](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-014.md): A code directive shows its file name or caption above the code
  - [SwRS-MDOKFSTUDIO-CODE-015](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-015.md): Render a captioned code directive as a figure with a reference target
  - [SwRS-MDOKFSTUDIO-CODE-016](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-016.md): Keep code backgrounds soft and readable in the forced white and cream themes
  - [SwRS-MDOKFSTUDIO-CODE-028](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-028.md): Join a code caption to its block as a title bar
  - [SwRS-MDOKFSTUDIO-CODE-030](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-030.md): Never highlight inline code
  - [SwRS-MDOKFSTUDIO-CODE-031](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-031.md): Show fenced code text literally
  - [SwRS-MDOKFSTUDIO-CODE-036](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-036.md): Show diff blocks as a full-width square panel
  - [SwRS-MDOKFSTUDIO-CODE-037](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-037.md): Fall back to escaped text lines when a grammar fails
  - [SwRS-MDOKFSTUDIO-CODE-038](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-038.md): Colour YAML code text with the link colour in the forced white and cream themes
  - [SwRS-MDOKFSTUDIO-CODE-039](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-039.md): Code blocks of two lines or more are numbered by a setting, never in the copied text
  - [SwRS-MDOKFSTUDIO-CODE-040](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-040.md): Code blocks sit on a dark Dark+ background in every preview theme by a setting
  - [SwRS-MDOKFSTUDIO-CORE-028](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-028.md): Body text, headings, lists and inline code are typeset readably
- Supersedes:
  - [StRS-MDOKFSTUDIO-CODE-002](StRS-MDOKFSTUDIO-CODE-002.md): Read diffs as additions and deletions
  - [StRS-MDOKFSTUDIO-CODE-003](StRS-MDOKFSTUDIO-CODE-003.md): Read numbered, emphasized and captioned listings
<!-- okf:links:end -->
