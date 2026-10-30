---
type: StRS
id: StRS-MDOKFSTUDIO-CORE-003
uuid: 056076a8-38d3-4f28-bede-66a97220d9fd
title: A reader sees what cannot be rendered and keeps a usable preview
description: When content cannot be rendered or loaded, or a render fails, the
  Studio SHALL show a visible placeholder, a listed warning, the last good page
  marked as outdated or an error page with the failure message instead of a
  silent gap, and keep showing the previous page until a newer render is ready.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: Writers need to know what the preview leaves out, so that a gap is
  never mistaken for an empty result, and need the preview to stay trustworthy
  while they type and when something goes wrong.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-001
- SwRS-MDOKFSTUDIO-CORE-008
- SwRS-MDOKFSTUDIO-CORE-009
- SwRS-MDOKFSTUDIO-CORE-012
- SwRS-MDOKFSTUDIO-CORE-013
- SwRS-MDOKFSTUDIO-CORE-014
- SwRS-MDOKFSTUDIO-CORE-016
- SwRS-MDOKFSTUDIO-CORE-018
- SwRS-MDOKFSTUDIO-CORE-019
- SwRS-MDOKFSTUDIO-CORE-022
- SwRS-MDOKFSTUDIO-CORE-023
- SwRS-MDOKFSTUDIO-CORE-024
- SwRS-MDOKFSTUDIO-CORE-025
- SwRS-MDOKFSTUDIO-CORE-026
- SwRS-MDOKFSTUDIO-CORE-036
- SwRS-MDOKFSTUDIO-CORE-047
- SwRS-MDOKFSTUDIO-CORE-067
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-CORE-005
---

## A reader sees what cannot be rendered and keeps a usable preview

### Normative behavior

When content cannot be rendered or loaded, or a render fails, the Studio SHALL show a visible placeholder, a listed warning, the last good page marked as outdated or an error page with the failure message instead of a silent gap, and keep showing the previous page until a newer render is ready.

### Preserved stakeholder intent

Writers need to know what the preview leaves out, so that a gap is never mistaken for an empty result. They also need the preview to stay trustworthy while they type and when something goes wrong.

### Rationale and constraints

- Covers unresolved directives, citations, refused includes and missing images; the preview stays read-only about them.
- When a render fails, the last good page stays visible and is marked as outdated, or an error page shows the failure message.
- A newer edit supersedes a render in progress; the previous page stays visible until a new one is ready.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-CORE-001](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-001.md): The preview renders the unsaved buffer completely, in process
  - [SwRS-MDOKFSTUDIO-CORE-008](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-008.md): Images fit the column, sit on the line and survive a missing file
  - [SwRS-MDOKFSTUDIO-CORE-009](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-009.md): Keep an image whose file is missing
  - [SwRS-MDOKFSTUDIO-CORE-012](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-012.md): An include is expanded in place and mapped to its directive
  - [SwRS-MDOKFSTUDIO-CORE-013](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-013.md): Includes are bounded by depth, budget, size and allowed roots
  - [SwRS-MDOKFSTUDIO-CORE-014](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-014.md): Keep unsupported include forms as placeholders
  - [SwRS-MDOKFSTUDIO-CORE-016](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-016.md): Limit the include budget per render
  - [SwRS-MDOKFSTUDIO-CORE-018](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-018.md): Refuse includes outside the allowed roots
  - [SwRS-MDOKFSTUDIO-CORE-019](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-019.md): Warn about a missing included file
  - [SwRS-MDOKFSTUDIO-CORE-022](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-022.md): Build-dependent constructs show an inert placeholder with a warning
  - [SwRS-MDOKFSTUDIO-CORE-023](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-023.md): List a warning for an unavailable directive
  - [SwRS-MDOKFSTUDIO-CORE-024](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-024.md): List diagnostics with file, line and severity
  - [SwRS-MDOKFSTUDIO-CORE-025](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-025.md): A failed render keeps the previous page and lists its diagnostics
  - [SwRS-MDOKFSTUDIO-CORE-026](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-026.md): Cancel a superseded render
  - [SwRS-MDOKFSTUDIO-CORE-036](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-036.md): Style placeholders as inert
  - [SwRS-MDOKFSTUDIO-CORE-047](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-047.md): Show a citation as an unresolved placeholder
  - [SwRS-MDOKFSTUDIO-CORE-067](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-067.md): Refuse oversize included files
- Supersedes:
  - [StRS-MDOKFSTUDIO-CORE-005](StRS-MDOKFSTUDIO-CORE-005.md): Keep the preview usable when a render fails
<!-- okf:links:end -->
