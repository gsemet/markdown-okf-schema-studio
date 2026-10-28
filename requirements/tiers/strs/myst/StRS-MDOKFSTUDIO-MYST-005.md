---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-005
uuid: 7a515e64-8640-46e7-a87b-013219481ae4
title: Build-dependent constructs appear as labelled placeholders
description: When a document uses citations, a bibliography or an unknown
  directive, the Studio SHALL show an inert, labelled placeholder for it.
project: markdown-okf-schema-studio
scope: myst
lifecycle: proposed
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
