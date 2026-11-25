---
type: StRS
id: StRS-MDOKFSTUDIO-TRUST-012
uuid: 8ed6bc89-a9fe-4588-a922-17ff65bf8a69
title: Visible text and the icon speak of the product
description: When the Studio shows a text to the reader or appears in the
  Extensions view, the Studio SHALL speak of the product, never naming its
  internal build tool and showing its own icon.
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
scenarios:
- id: S1
  title: Read a text of the preview
- id: S2
  title: Find the Studio in the Extensions view
user_need: As a reader, I see messages that speak of the preview, not of the
  tools that built it, and I recognise the Studio in the Extensions view by its
  own icon.
derived_by:
- SwRS-MDOKFSTUDIO-TRUST-070
- SwRS-MDOKFSTUDIO-TRUST-074
default_owner_email: gaetan@xeberon.net
---

## Visible text and the icon speak of the product

### Normative behavior

When the Studio shows a text to the reader or appears in the Extensions view, the Studio SHALL speak of the product, never naming its internal build tool and showing its own icon.

### Preserved stakeholder intent

As a reader, I see messages that speak of the preview, not of the tools that built it, and I recognise the Studio in the Extensions view by its own icon.

### Rationale and constraints

- The opt-in behaviour of the Studio, which leaves the built-in Markdown preview untouched, is specified in the lifecycle-sync scope.
- Messages to the reader speak of the preview and the Studio, not of the build tool, and the package shows one icon: images/logo.png, a 256 by 256 pixel PNG (SwRS-MDOKFSTUDIO-TRUST-074).

### Use case diagram

```mermaid
flowchart LR
    R[Reader] -->|reads| M[Messages of the preview]
    R -->|looks at| X[Extensions view]
    M --> S[Speak of the product, never of the build tool]
    X --> I[The Studio own icon]
```

### Main paths

#### Path S1: Read a text of the preview

1. The Studio shows a text to the reader
   - SwRS-MDOKFSTUDIO-TRUST-070: the text never mentions the build tool
2. The reader reads a text that speaks of the preview

#### Path S2: Find the Studio in the Extensions view

1. The Studio appears in the Extensions view
   - SwRS-MDOKFSTUDIO-TRUST-074: the package declares its 256 pixel PNG icon
2. The reader recognises the Studio by its own icon

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-TRUST-070](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-070.md): Visible text speaks of the product, not of its build tool
  - [SwRS-MDOKFSTUDIO-TRUST-074](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-074.md): The package declares its 256 pixel PNG icon
<!-- okf:links:end -->
