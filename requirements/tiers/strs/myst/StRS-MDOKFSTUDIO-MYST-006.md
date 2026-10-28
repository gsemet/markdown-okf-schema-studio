---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-006
uuid: 57486d1a-28f4-417c-8399-d0375937e762
title: Maths is typeset offline and bad formulas stay readable
description: When a document contains inline, display or aligned maths, the
  Studio SHALL show it typeset without network access, and keep an invalid
  formula readable.
project: markdown-okf-schema-studio
scope: myst
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I want formulas rendered offline and failures left
  legible so that I can fix them in place.
derived_by:
- SwRS-MDOKFSTUDIO-MYST-024
- SwRS-MDOKFSTUDIO-MYST-025
- SwRS-MDOKFSTUDIO-MYST-026
- SwRS-MDOKFSTUDIO-MYST-027
- SwRS-MDOKFSTUDIO-MYST-028
- SwRS-MDOKFSTUDIO-MYST-029
default_owner_email: gaetan@xeberon.net
---

## Maths is typeset offline and bad formulas stay readable

### Normative behavior

When a document contains inline, display or aligned maths, the Studio SHALL show it typeset without network access, and keep an invalid formula readable.

### Preserved stakeholder intent

As a writer, I want formulas rendered offline and failures left legible so that I can fix them in place.

### Rationale and constraints

- Works with no network; an invalid formula is shown as its source text, not dropped.
