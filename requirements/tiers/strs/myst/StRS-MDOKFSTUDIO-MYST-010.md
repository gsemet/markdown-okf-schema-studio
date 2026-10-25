---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-010
uuid: 80d1d1f1-7f09-4e46-bf36-b0d0a35a7f84
title: A label can be renamed safely from its anchor
description: When a writer renames a label from its anchor icon, the Studio
  SHALL apply it as one undoable edit, or explain why it refuses.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-MYST-009; no marker expected."
derives_from: []
user_need: As a writer, I want safe label renaming so that references do not
  silently break.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-MYST-009
---

## A label can be renamed safely from its anchor

### Normative behavior

When a writer renames a label from its anchor icon, the Studio SHALL apply it as one undoable edit, or explain why it refuses.

### Preserved stakeholder intent

As a writer, I want safe label renaming so that references do not silently break.

### Rationale and constraints

- A refused rename tells the writer why and leaves the document unchanged.
