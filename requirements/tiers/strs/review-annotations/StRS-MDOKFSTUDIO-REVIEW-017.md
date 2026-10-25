---
type: StRS
id: StRS-MDOKFSTUDIO-REVIEW-017
uuid: 2ee9ae44-902d-43ee-9a80-996823108b14
title: A writer sees which blocks changed since the last commit
description: When a file tracked by Git differs from its last commit, the Studio
  SHALL mark each changed block of the preview with a green bar, and stop
  showing the bars when the writer hides the changes.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I see at a glance what I changed since the last commit,
  unsaved edits included, and I read the document without the bars when I do not
  need them.
derived_by:
- SwRS-MDOKFSTUDIO-REVIEW-195
- SwRS-MDOKFSTUDIO-REVIEW-200
- SwRS-MDOKFSTUDIO-REVIEW-203
- SwRS-MDOKFSTUDIO-REVIEW-207
- SwRS-MDOKFSTUDIO-REVIEW-208
- SwRS-MDOKFSTUDIO-REVIEW-214
---

## A writer sees which blocks changed since the last commit

### Normative behavior

When a file tracked by Git differs from its last commit, the Studio SHALL mark each changed block of the preview with a green bar, and stop showing the bars when the writer hides the changes.

### Preserved stakeholder intent

As a writer, I see at a glance what I changed since the last commit, unsaved edits included, and I read the document without the bars when I do not need them.

### Rationale and constraints

- Files that Git does not know, other schemes and untrusted workspaces show nothing.
- The bars never move the text.
- Hiding the changes is done with the toolbar button or the setting; the setting is the master switch and removes the toolbar button, and the button choice is kept per workspace.
