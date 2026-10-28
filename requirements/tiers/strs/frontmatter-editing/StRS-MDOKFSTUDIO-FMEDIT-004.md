---
type: StRS
id: StRS-MDOKFSTUDIO-FMEDIT-004
uuid: 3ad4b58a-304b-450c-bdd3-c3514ce66a1d
title: Save, cancel and follow metadata edits
description: When a writer commits or cancels a metadata edit, the Studio SHALL
  save only a changed value, show the progress and any refusal in the editor,
  keep the properties table in place, and leave the document undoable.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I know whether my metadata edit was saved, refused or
  cancelled, and I can undo it like any other edit.
derived_by: []
superseded_by:
- StRS-MDOKFSTUDIO-FMEDIT-001
default_owner_email: gaetan@xeberon.net
---

## Save, cancel and follow metadata edits

### Normative behavior

When a writer commits or cancels a metadata edit, the Studio SHALL save only a changed value, show the progress and any refusal in the editor, keep the properties table in place, and leave the document undoable.

### Preserved stakeholder intent

Writers expect to see at once whether a metadata edit was saved, refused or cancelled, and to be able to undo it.

As a writer, I know whether my metadata edit was saved, refused or cancelled, and I can undo it like any other edit.

### Rationale and constraints

- Unchanged values are not written; Escape cancels unless a save is in flight; turning edit mode off closes the editor without saving.
- Known issue: leaving edit mode discards an unsaved field value while block editors save theirs.
- A refusal keeps the editor open with the host message shown and the controls enabled again.
- Each save is one edit of the document, so one Undo reverts it; undo keys typed in a field editor act on the field text only.
