---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-009
uuid: e2b9b8ec-f062-4284-84fb-ad697268d82f
title: A writer sees, links and renames labels safely
description: When a document defines a label or links to a heading, figure,
  table, equation or label with a reference role, the Studio SHALL show an
  anchor icon next to the label target and a link whose target is visible, and
  apply a rename from the anchor as one undoable edit or explain why it refuses.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I want to see where each cross-reference points, reuse
  each label and rename it safely, so that cross-references are easy and
  references do not silently break.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-MYST-019
- SwRS-MDOKFSTUDIO-MYST-036
- SwRS-MDOKFSTUDIO-MYST-037
- SwRS-MDOKFSTUDIO-MYST-038
- SwRS-MDOKFSTUDIO-MYST-039
- SwRS-MDOKFSTUDIO-MYST-040
- SwRS-MDOKFSTUDIO-MYST-041
- SwRS-MDOKFSTUDIO-MYST-042
- SwRS-MDOKFSTUDIO-MYST-043
- SwRS-MDOKFSTUDIO-MYST-044
- SwRS-MDOKFSTUDIO-MYST-045
- SwRS-MDOKFSTUDIO-MYST-046
- SwRS-MDOKFSTUDIO-MYST-047
- SwRS-MDOKFSTUDIO-MYST-048
- SwRS-MDOKFSTUDIO-MYST-049
- SwRS-MDOKFSTUDIO-MYST-050
- SwRS-MDOKFSTUDIO-MYST-051
- SwRS-MDOKFSTUDIO-MYST-090
- SwRS-MDOKFSTUDIO-MYST-094
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
---

## A writer sees, links and renames labels safely

### Normative behavior

When a document defines a label or links to a heading, figure, table, equation or label with a reference role, the Studio SHALL show an anchor icon next to the label target and a link whose target is visible, and apply a rename from the anchor as one undoable edit or explain why it refuses.

### Preserved stakeholder intent

Writers want to see where each cross-reference points so that they can spot broken links early, to see and reuse each label, and to rename labels without references silently breaking.

### Rationale and constraints

- The anchor is shown only for labels that exist in the document.
- Targets that cannot be resolved without a project build are shown as written rather than hidden.
- A refused rename tells the writer why and leaves the document unchanged.
