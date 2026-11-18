---
type: StRS
id: StRS-MDOKFSTUDIO-CORE-002
uuid: dcc2b09c-7859-4a0c-adc1-2d60efe92d71
title: A writer composes a document from included files
description: When a document includes other Markdown files, the Studio SHALL
  show the included content in place, keep a block that comes from an included
  file out of the copy, cut and paste edits of the including document, and
  report an include it cannot read.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: Writers need to build a document from several files and still edit
  each file in its own place.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-012
- SwRS-MDOKFSTUDIO-CORE-013
- SwRS-MDOKFSTUDIO-CORE-014
- SwRS-MDOKFSTUDIO-CORE-015
- SwRS-MDOKFSTUDIO-CORE-016
- SwRS-MDOKFSTUDIO-CORE-017
- SwRS-MDOKFSTUDIO-CORE-018
- SwRS-MDOKFSTUDIO-CORE-019
- SwRS-MDOKFSTUDIO-CORE-067
default_owner_email: gaetan@xeberon.net
---

## A writer composes a document from included files

### Normative behavior

When a document includes other Markdown files, the Studio SHALL show the included content in place, keep a block that comes from an included file out of the copy, cut and paste edits of the including document, and report an include it cannot read.

### Preserved stakeholder intent

Writers need to build a document from several files and still edit each file in its own place.

### Rationale and constraints

- Included content is shown in the including document but is edited in its own file: the editor never targets host lines for a block that comes from an include, so that block cannot be copied, cut or pasted next to (the refusal says so). A writer who wants to change it opens the included file.
- An include is read only from the folders the allowed-roots rule grants (see the use case about content the preview cannot render); depth, cycles, count and size are bounded, and a refused or missing include stays a placeholder with a warning.

### Main paths

#### Path 1: Show an included file in place

1. A trusted document holds an include directive
   - SwRS-MDOKFSTUDIO-CORE-012: the preview renders the included Markdown file in place of the directive and maps every included block to the lines of the directive
   - Option SwRS-MDOKFSTUDIO-CORE-012 (refusal): an unsupported include form stays an unresolved placeholder
   - Option SwRS-MDOKFSTUDIO-CORE-013 (refusal): an include outside the allowed root, or a cycle, is refused
2. The included content is shown in place

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-CORE-012](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-012.md): An include is expanded in place and mapped to its directive
  - [SwRS-MDOKFSTUDIO-CORE-013](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-013.md): Includes are bounded by depth, budget, size and allowed roots
  - [SwRS-MDOKFSTUDIO-CORE-014](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-014.md): Keep unsupported include forms as placeholders
  - [SwRS-MDOKFSTUDIO-CORE-015](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-015.md): Map included blocks to the include directive
  - [SwRS-MDOKFSTUDIO-CORE-016](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-016.md): Limit the include budget per render
  - [SwRS-MDOKFSTUDIO-CORE-017](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-017.md): Read a repeated include once per render
  - [SwRS-MDOKFSTUDIO-CORE-018](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-018.md): Refuse includes outside the allowed roots
  - [SwRS-MDOKFSTUDIO-CORE-019](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-019.md): Warn about a missing included file
  - [SwRS-MDOKFSTUDIO-CORE-067](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-067.md): Refuse oversize included files
<!-- okf:links:end -->
