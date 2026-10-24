---
type: StRS
id: StRS-MDOKFSTUDIO-CORE-002
uuid: dcc2b09c-7859-4a0c-adc1-2d60efe92d71
title: Compose a document from included files
description: When a document includes other Markdown files, the Studio SHALL
  show the included content in place and let the writer edit it from the include
  location.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
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
---

## Compose a document from included files

### Normative behavior

When a document includes other Markdown files, the Studio SHALL show the included content in place and let the writer edit it from the include location.

### Preserved stakeholder intent

Writers need to build a document from several files and still edit it from the right place.

### Rationale and constraints

- An include is read only from the document folder or the workspace root; refused includes are reported (see the unrendered-content need).
