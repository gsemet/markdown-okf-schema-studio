---
type: StRS
id: StRS-MDOKFSTUDIO-BLOCK-026
uuid: 6091a555-423e-42e1-ae00-818e27641c60
title: Diagnose an editor that closed by itself
description: While a block editor is used, the Studio SHALL keep a short trace
  of editor events for diagnostics.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: deprecated
origin: native
tier: StRS
derives_from: []
user_need: As a maintainer, I can read the last editor events of a page when a
  report says an editor closed or lost the focus by itself.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-249
- SwRS-MDOKFSTUDIO-BLOCK-250
default_owner_email: gaetan@xeberon.net
---

## Diagnose an editor that closed by itself

### Normative behavior

While a block editor is used, the Studio SHALL keep a short trace of editor events for diagnostics.

### Preserved stakeholder intent

Maintainers expect a failing editor test or report to name what closed the editor.

As a maintainer, I can read the last editor events of a page when a report says an editor closed or lost the focus by itself.

### Rationale and constraints

- The trace changes nothing visible and is only read for diagnostics.
