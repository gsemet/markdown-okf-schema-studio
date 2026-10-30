---
type: StRS
id: StRS-MDOKFSTUDIO-CORE-002
uuid: dcc2b09c-7859-4a0c-adc1-2d60efe92d71
title: A writer composes a document from included files
description: When a document includes other Markdown files, the Studio SHALL
  show the included content in place and let the writer edit it from the include
  location.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: Writers need to build a document from several files and still edit it
  from the right place.
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

When a document includes other Markdown files, the Studio SHALL show the included content in place and let the writer edit it from the include location.

### Preserved stakeholder intent

Writers need to build a document from several files and still edit it from the right place.

### Rationale and constraints

- An include is read only from the document folder or the workspace root; refused includes are reported (see the use case about content the preview cannot render).

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
