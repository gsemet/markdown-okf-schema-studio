---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-009
uuid: e2b9b8ec-f062-4284-84fb-ad697268d82f
title: Label anchors are visible and linkable
description: When a document defines a label, the Studio SHALL show an anchor
  icon next to its target and let the writer link to it.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I want to see and reuse each label so that
  cross-references are easy.
derived_by:
- SwRS-MDOKFSTUDIO-MYST-036
- SwRS-MDOKFSTUDIO-MYST-037
---

## Label anchors are visible and linkable

### Normative behavior

When a document defines a label, the Studio SHALL show an anchor icon next to its target and let the writer link to it.

### Preserved stakeholder intent

As a writer, I want to see and reuse each label so that cross-references are easy.

### Rationale and constraints

- The anchor is shown only for labels that exist in the document.
