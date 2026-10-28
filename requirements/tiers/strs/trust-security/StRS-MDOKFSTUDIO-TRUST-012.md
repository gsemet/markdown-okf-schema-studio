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
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
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
