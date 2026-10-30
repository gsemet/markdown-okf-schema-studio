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
req_lifecycle: proposed
status: stable
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
- SwRS-MDOKFSTUDIO-REVIEW-215
default_owner_email: gaetan@xeberon.net
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-REVIEW-195](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-195.md): The host posts the lines that differ from the last commit
  - [SwRS-MDOKFSTUDIO-REVIEW-200](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-200.md): The line diff reports added and modified lines
  - [SwRS-MDOKFSTUDIO-REVIEW-203](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-203.md): The HEAD text comes from the built-in Git extension for small files
  - [SwRS-MDOKFSTUDIO-REVIEW-207](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-207.md): Changed blocks get a thin change bar that moves nothing
  - [SwRS-MDOKFSTUDIO-REVIEW-208](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-208.md): Malformed incoming-change ranges are ignored
  - [SwRS-MDOKFSTUDIO-REVIEW-214](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-214.md): The Diff button and the showIncomingChanges setting hide the change bars
  - [SwRS-MDOKFSTUDIO-REVIEW-215](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-215.md): Changed or added front matter fields get their own change bar
<!-- okf:links:end -->
