---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-005
uuid: 7a515e64-8640-46e7-a87b-013219481ae4
title: Build-dependent constructs appear as labelled placeholders
description: When a document uses citations, a bibliography or an unknown
  directive, the Studio SHALL show an inert, labelled placeholder for it.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I want to know which constructs need a full project
  build so that I do not mistake a placeholder for a result.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-022
- SwRS-MDOKFSTUDIO-CORE-023
- SwRS-MDOKFSTUDIO-CORE-036
- SwRS-MDOKFSTUDIO-CORE-047
- SwRS-MDOKFSTUDIO-CORE-060
- SwRS-MDOKFSTUDIO-MYST-019
- SwRS-MDOKFSTUDIO-MYST-020
- SwRS-MDOKFSTUDIO-MYST-021
- SwRS-MDOKFSTUDIO-MYST-022
- SwRS-MDOKFSTUDIO-MYST-023
- SwRS-MDOKFSTUDIO-MYST-096
- SwRS-MDOKFSTUDIO-MYST-097
default_owner_email: gaetan@xeberon.net
---

## Build-dependent constructs appear as labelled placeholders

### Normative behavior

When a document uses citations, a bibliography or an unknown directive, the Studio SHALL show an inert, labelled placeholder for it.

### Preserved stakeholder intent

As a writer, I want to know which constructs need a full project build so that I do not mistake a placeholder for a result.

### Rationale and constraints

- Placeholders never pretend to be the built result.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-CORE-022](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-022.md): Build-dependent constructs show an inert placeholder with a warning
  - [SwRS-MDOKFSTUDIO-CORE-023](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-023.md): List a warning for an unavailable directive
  - [SwRS-MDOKFSTUDIO-CORE-036](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-036.md): Style placeholders as inert
  - [SwRS-MDOKFSTUDIO-CORE-047](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-047.md): Show a citation as an unresolved placeholder
  - [SwRS-MDOKFSTUDIO-CORE-060](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-060.md): Keep references to captionless targets readable
  - [SwRS-MDOKFSTUDIO-MYST-019](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-019.md): Reference roles link to in-page targets
  - [SwRS-MDOKFSTUDIO-MYST-020](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-020.md): Unresolved citations show as muted keys
  - [SwRS-MDOKFSTUDIO-MYST-021](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-021.md): Directives needing a build show an inert placeholder with a warning
  - [SwRS-MDOKFSTUDIO-MYST-022](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-022.md): The bibliography directive explains build-time resolution
  - [SwRS-MDOKFSTUDIO-MYST-023](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-023.md): Notebook output references show a note and a warning
  - [SwRS-MDOKFSTUDIO-MYST-096](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-096.md): A directive the parser cannot build shows its source and the render continues
  - [SwRS-MDOKFSTUDIO-MYST-097](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-097.md): Code fences and front matter are read the same way everywhere
<!-- okf:links:end -->
