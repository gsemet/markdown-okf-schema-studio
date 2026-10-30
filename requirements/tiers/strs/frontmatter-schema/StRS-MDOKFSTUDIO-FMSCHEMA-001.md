---
type: StRS
id: StRS-MDOKFSTUDIO-FMSCHEMA-001
uuid: 10650af4-e1c7-454f-8c9a-6f01d11f7428
title: Frontmatter appears as a readable, configurable properties table
description: When a writer opens a document that starts with YAML frontmatter,
  the Studio SHALL show it as a properties table at the top of the preview,
  escaping every value, in a compact YAML-like form that fits the preview width,
  that follows the frontmatter settings and that refreshes in place shortly
  after the last edit.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I read my document metadata as a table above the text,
  safely, without opening the YAML; I read values in the form I typed them, hide
  the Description column when I need room, turn the table off or adjust how
  frontmatter is checked, and see validation results update while I type.
derived_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-001
- SwRS-MDOKFSTUDIO-FMSCHEMA-002
- SwRS-MDOKFSTUDIO-FMSCHEMA-003
- SwRS-MDOKFSTUDIO-FMSCHEMA-004
- SwRS-MDOKFSTUDIO-FMSCHEMA-005
- SwRS-MDOKFSTUDIO-FMSCHEMA-006
- SwRS-MDOKFSTUDIO-FMSCHEMA-007
- SwRS-MDOKFSTUDIO-FMSCHEMA-008
- SwRS-MDOKFSTUDIO-FMSCHEMA-009
- SwRS-MDOKFSTUDIO-FMSCHEMA-010
- SwRS-MDOKFSTUDIO-FMSCHEMA-011
- SwRS-MDOKFSTUDIO-FMSCHEMA-012
- SwRS-MDOKFSTUDIO-FMSCHEMA-013
- SwRS-MDOKFSTUDIO-FMSCHEMA-014
- SwRS-MDOKFSTUDIO-FMSCHEMA-015
- SwRS-MDOKFSTUDIO-FMSCHEMA-016
- SwRS-MDOKFSTUDIO-FMSCHEMA-043
- SwRS-MDOKFSTUDIO-FMSCHEMA-044
- SwRS-MDOKFSTUDIO-FMSCHEMA-045
- SwRS-MDOKFSTUDIO-FMSCHEMA-075
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-FMSCHEMA-003
- StRS-MDOKFSTUDIO-FMSCHEMA-004
- StRS-MDOKFSTUDIO-FMSCHEMA-005
- StRS-MDOKFSTUDIO-FMSCHEMA-013
---

## Frontmatter appears as a readable, configurable properties table

### Normative behavior

When a writer opens a document that starts with YAML frontmatter, the Studio SHALL show it as a properties table at the top of the preview, escaping every value, in a compact YAML-like form that fits the preview width, that follows the frontmatter settings and that refreshes in place shortly after the last edit.

### Preserved stakeholder intent

As a writer, I read my document metadata as a table above the text, safely, without opening the YAML; I read values in the form I typed them, hide the Description column when I need room, turn the table off or adjust how frontmatter is checked, and see validation results update while I type.

### Rationale and constraints

- A block needs a first-line fence and a closing fence alone on its line; a value ending in the closing fence marks does not close it and a document without a closing fence has no frontmatter. An empty block (two adjacent fences) is recognised but shows the "Frontmatter is not a mapping." error row instead of an empty table (Known issue). CRLF fences are accepted.
- Frontmatter without a string type, or whose type has no schema, shows a generic two-column table headed "Names / Values" in source key order, with nested mappings as YAML code.
- The properties section maps to source line 1, so syncing the source to line 1 shows the top of the preview.
- Known issue: a leading byte-order mark in the document itself is not stripped, so such a file shows no frontmatter (it is stripped only for linked targets).
- Known issue: the generic header reads "Names / Values" while a schema table reads "Name / Value".
- Booleans show as a read-only checkbox followed by true or false; lists show one dash-marked item per line, at most 50 items then "+ N more"; an empty list shows [] and null shows null.
- The table has a lean frame (no outer border, transparent cells, grey header cells) and in a narrow preview uses a fixed layout in which names, values, links and type labels wrap anywhere, so the table never pushes the page sideways.
- Known issue: in a narrow preview a word can still break in the middle of a name; there is no stacked layout.
- Known issue: an unused helper of the table renderer would show an em dash for null; today null shows null.
- A toggle in the column headers collapses and restores the Description column, keeping Name and Value readable; error rows re-span the visible columns; the choice survives a refresh and is kept for the 200 most recent documents.
- Without a remembered choice, a narrow preview starts with the Description column collapsed (measured when the page starts).
- The frontmatter table setting is a boolean, on by default; off, the body (its first heading) still renders and neither the table nor the raw YAML is shown. The frontmatter is still parsed and validated while it is off, but nothing is shown.
- Any change to a frontmatter setting (table, strict additional properties, bundle root, project root, outside-workspace links) re-analyses the open preview whose document is the active editor's document; other previews are only re-rendered from their last good render (Known issue).
- The frontmatter is re-analysed 300 ms after the last change; while a field editor is open the new table waits until it closes; a page not ready for the current render loads the full document instead.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-001](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-001.md): The frontmatter block is found by its fences and parsed as a YAML mapping
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-002](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-002.md): A document without a closing fence has no frontmatter
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-003](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-003.md): Frontmatter fences accept Windows line endings
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-004](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-004.md): The propertiesTable setting hides the table while the body renders
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-005](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-005.md): Without a schema the table lists the keys in source order, escaped
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-006](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-006.md): Property values read like YAML in a lean table
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-007](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-007.md): Boolean values show as read-only checkboxes
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-008](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-008.md): Long lists are cut after fifty items
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-009](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-009.md): Empty lists and null values show as YAML tokens
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-010](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-010.md): The properties table has a lean frame
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-011](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-011.md): The table fits a narrow preview
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-012](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-012.md): Every table value is HTML-escaped
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-013](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-013.md): The properties section maps to source line 1
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-014](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-014.md): The Description column collapses and the choice is kept per document
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-015](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-015.md): The Description choice is remembered per document
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-016](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-016.md): Narrow previews start with the Description column collapsed
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-043](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-043.md): The table is refreshed in place after edits, after the field editor closes
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-044](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-044.md): A new table waits while a field editor is open
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-045](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-045.md): A frontmatter setting change re-analyses the open previews
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-075](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-075.md): The body still renders when the table is off
- Supersedes:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-003](StRS-MDOKFSTUDIO-FMSCHEMA-003.md): Property values read like YAML
  - [StRS-MDOKFSTUDIO-FMSCHEMA-004](StRS-MDOKFSTUDIO-FMSCHEMA-004.md): The Description column can be collapsed
  - [StRS-MDOKFSTUDIO-FMSCHEMA-005](StRS-MDOKFSTUDIO-FMSCHEMA-005.md): Frontmatter settings control the table and apply live
  - [StRS-MDOKFSTUDIO-FMSCHEMA-013](StRS-MDOKFSTUDIO-FMSCHEMA-013.md): The table follows edits to the document
<!-- okf:links:end -->
