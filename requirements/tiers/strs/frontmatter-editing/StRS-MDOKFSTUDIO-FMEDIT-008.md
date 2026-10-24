---
type: StRS
id: StRS-MDOKFSTUDIO-FMEDIT-008
uuid: 91735d1e-d0c9-4d6e-9c80-607ac7b80020
title: Keep the frontmatter source intact when editing
description: When a writer edits a metadata field, the Studio SHALL change only
  the lines of that field and refuse any edit whose result would not parse or
  would alter other keys.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer or reviewer, I expect a metadata edit to leave comments,
  quoting, line endings and the rest of the document unchanged.
derived_by:
- SwRS-MDOKFSTUDIO-FMEDIT-025
- SwRS-MDOKFSTUDIO-FMEDIT-030
- SwRS-MDOKFSTUDIO-FMEDIT-039
- SwRS-MDOKFSTUDIO-FMEDIT-043
- SwRS-MDOKFSTUDIO-FMEDIT-044
- SwRS-MDOKFSTUDIO-FMEDIT-045
- SwRS-MDOKFSTUDIO-FMEDIT-046
---

## Keep the frontmatter source intact when editing

### Normative behavior

When a writer edits a metadata field, the Studio SHALL change only the lines of that field and refuse any edit whose result would not parse or would alter other keys.

### Preserved stakeholder intent

Writers and reviewers expect the diff of a metadata edit to contain only the edited field.

As a writer or reviewer, I expect a metadata edit to leave comments, quoting, line endings and the rest of the document unchanged.

### Rationale and constraints

- Quoting style, folded or literal headers, comments, fences, the body and line endings are preserved; anchored or aliased values fall back to a whole-block rewrite.
- Every edit is re-parsed and refused when it would lose, duplicate or corrupt a key.
