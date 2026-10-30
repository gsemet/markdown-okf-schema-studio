---
type: StRS
id: StRS-MDOKFSTUDIO-REVIEW-012
uuid: 90da3c53-c05a-4dff-a0d9-c77720c20296
title: A writer sees HTML comments and TODO notes as chips and toggles them
description: When a document holds an HTML comment or the word TODO, the Studio
  SHALL show it as a small chip that opens into a box with the comment text, let
  the writer hide the gray comment chips while the TODO chips stay, and toggle a
  TODO comment around the current or selected lines from the keyboard in a block
  editor.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: approved
status: stable
approved_by: gaetan@xeberon.net
approved_at: '2026-10-28T00:00:00Z'
verified:
  by: human:gaetan@xeberon.net
  at: '2026-10-28T00:00:00Z'
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I see the notes left in the source without opening the
  source, I read the clean text when I do not need the notes, and I mark a line
  as a to-do and unmark it without typing the comment markers.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-170
- SwRS-MDOKFSTUDIO-REVIEW-003
- SwRS-MDOKFSTUDIO-REVIEW-133
- SwRS-MDOKFSTUDIO-REVIEW-139
- SwRS-MDOKFSTUDIO-REVIEW-143
- SwRS-MDOKFSTUDIO-REVIEW-152
- SwRS-MDOKFSTUDIO-REVIEW-156
- SwRS-MDOKFSTUDIO-REVIEW-160
default_owner_email: gaetan@xeberon.net
---

## A writer sees HTML comments and TODO notes as chips and toggles them

### Normative behavior

When a document holds an HTML comment or the word TODO, the Studio SHALL show it as a small chip that opens into a box with the comment text, let the writer hide the gray comment chips while the TODO chips stay, and toggle a TODO comment around the current or selected lines from the keyboard in a block editor.

### Preserved stakeholder intent

As a writer, I see the notes left in the source without opening the source, I read the clean text when I do not need the notes, and I mark a line as a to-do and unmark it without typing the comment markers.

### Rationale and constraints

- Comments used by tools such as linters stay hidden.
- What is open stays open while the writer types.
- Hiding the comments is done with the toolbar button or the setting; the setting is the master switch and removes the toolbar button, and the button choice is kept per workspace.
- The TODO shortcut action is also offered by the edition palette and the slash menu.
- Each TODO toggle is one undo step.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-LIFE-170](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-170.md): A new page starts each view choice from the panel, stored or default value
  - [SwRS-MDOKFSTUDIO-REVIEW-003](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-003.md): Edit mode titles an open comment with its literal tag
  - [SwRS-MDOKFSTUDIO-REVIEW-133](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-133.md): HTML comments show as gray chips carried as data
  - [SwRS-MDOKFSTUDIO-REVIEW-139](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-139.md): TODO words and TODO comments show as green chips
  - [SwRS-MDOKFSTUDIO-REVIEW-143](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-143.md): A click or Enter on a chip toggles its comment box
  - [SwRS-MDOKFSTUDIO-REVIEW-152](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-152.md): The showComments setting and the Comments button hide and show the chips
  - [SwRS-MDOKFSTUDIO-REVIEW-156](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-156.md): A show-comments message of another render is ignored
  - [SwRS-MDOKFSTUDIO-REVIEW-160](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-160.md): The TODO action wraps or unwraps the touched lines in TODO comments
<!-- okf:links:end -->
