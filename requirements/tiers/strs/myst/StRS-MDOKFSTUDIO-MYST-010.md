---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-010
uuid: 80d1d1f1-7f09-4e46-bf36-b0d0a35a7f84
title: A label can be renamed safely from its anchor
description: When a writer renames a label from its anchor icon, the Studio
  SHALL apply it as one undoable edit, or explain why it refuses.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: superseded
status: deprecated
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I want safe label renaming so that references do not
  silently break.
derived_by: []
superseded_by:
- StRS-MDOKFSTUDIO-MYST-009
default_owner_email: gaetan@xeberon.net
---

## A label can be renamed safely from its anchor

### Normative behavior

When a writer renames a label from its anchor icon, the Studio SHALL apply it as one undoable edit, or explain why it refuses.

### Preserved stakeholder intent

As a writer, I want safe label renaming so that references do not silently break.

### Rationale and constraints

- A refused rename tells the writer why and leaves the document unchanged.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Superseded by:
  - [StRS-MDOKFSTUDIO-MYST-009](StRS-MDOKFSTUDIO-MYST-009.md): A writer sees, links and renames labels safely
<!-- okf:links:end -->
