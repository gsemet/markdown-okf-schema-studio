---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-004
uuid: 137599c0-018a-46a0-8fcc-c0392d8c8801
title: Reference roles show where a link goes
description: When a writer links to a heading, figure, table, equation or label
  with a reference role, the Studio SHALL show a link whose target is visible.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I want to see where each cross-reference points so that
  I can spot broken links early.
derived_by:
- SwRS-MDOKFSTUDIO-MYST-019
---

## Reference roles show where a link goes

### Normative behavior

When a writer links to a heading, figure, table, equation or label with a reference role, the Studio SHALL show a link whose target is visible.

### Preserved stakeholder intent

As a writer, I want to see where each cross-reference points so that I can spot broken links early.

### Rationale and constraints

- Targets that cannot be resolved without a project build are shown as written rather than hidden.
