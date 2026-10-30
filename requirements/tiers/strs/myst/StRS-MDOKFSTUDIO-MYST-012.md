---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-012
uuid: 2bca15d5-215d-4915-91e2-f067ec97a862
title: A toctree shows the linked documents and marks missing ones
description: When a document contains a table of contents directive, the Studio
  SHALL list the documents it names as links and mark missing ones.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I want to see the document tree I declared so that I can
  catch missing pages.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-054
- SwRS-MDOKFSTUDIO-CORE-055
- SwRS-MDOKFSTUDIO-MYST-057
- SwRS-MDOKFSTUDIO-MYST-058
- SwRS-MDOKFSTUDIO-MYST-059
- SwRS-MDOKFSTUDIO-MYST-060
- SwRS-MDOKFSTUDIO-MYST-061
- SwRS-MDOKFSTUDIO-MYST-062
default_owner_email: gaetan@xeberon.net
---

## A toctree shows the linked documents and marks missing ones

### Normative behavior

When a document contains a table of contents directive, the Studio SHALL list the documents it names as links and mark missing ones.

### Preserved stakeholder intent

As a writer, I want to see the document tree I declared so that I can catch missing pages.

### Rationale and constraints

- Documents that do not exist are marked, not silently dropped.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-CORE-054](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-054.md): List documents matching a toctree glob
  - [SwRS-MDOKFSTUDIO-CORE-055](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-055.md): Bound the toctree glob scan
  - [SwRS-MDOKFSTUDIO-MYST-057](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-057.md): Toctree lists linked documents and marks missing ones
  - [SwRS-MDOKFSTUDIO-MYST-058](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-058.md): Toctree caption and hidden options
  - [SwRS-MDOKFSTUDIO-MYST-059](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-059.md): Toctree glob entries list matching documents sorted
  - [SwRS-MDOKFSTUDIO-MYST-060](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-060.md): Toctree reversed option flips the order
  - [SwRS-MDOKFSTUDIO-MYST-061](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-061.md): Toctree shows at most 500 entries
  - [SwRS-MDOKFSTUDIO-MYST-062](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-062.md): Missing toctree documents show as warned text
<!-- okf:links:end -->
