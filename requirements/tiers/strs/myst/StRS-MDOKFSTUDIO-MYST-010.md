---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-010
uuid: 80d1d1f1-7f09-4e46-bf36-b0d0a35a7f84
title: A label can be renamed safely from its anchor
description: When a writer renames a label from its anchor icon, the Studio
  SHALL apply it as one undoable edit, or explain why it refuses.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I want safe label renaming so that references do not
  silently break.
derived_by:
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
---

## A label can be renamed safely from its anchor

### Normative behavior

When a writer renames a label from its anchor icon, the Studio SHALL apply it as one undoable edit, or explain why it refuses.

### Preserved stakeholder intent

As a writer, I want safe label renaming so that references do not silently break.

### Rationale and constraints

- A refused rename tells the writer why and leaves the document unchanged.
