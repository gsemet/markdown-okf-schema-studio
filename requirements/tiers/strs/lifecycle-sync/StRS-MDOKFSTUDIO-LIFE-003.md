---
type: StRS
id: StRS-MDOKFSTUDIO-LIFE-003
uuid: 0e0f7e03-2869-48c9-beb3-e45588bf5fb2
title: The side preview follows the active file and refreshes on demand
description: When a writer moves to another Markdown file, the Studio SHALL
  switch the side preview to that file and name it in the panel title, and, when
  a reader asks for a refresh, render the shown document again from its current
  text and keep the reading position.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I keep one preview beside my editor and it shows the
  Markdown file I am working in, without opening a new preview each time; as a
  reader, I redraw the preview myself when I doubt that it is current, and I
  stay where I was reading.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-003
- SwRS-MDOKFSTUDIO-LIFE-024
- SwRS-MDOKFSTUDIO-LIFE-026
- SwRS-MDOKFSTUDIO-LIFE-032
- SwRS-MDOKFSTUDIO-LIFE-049
- SwRS-MDOKFSTUDIO-LIFE-100
- SwRS-MDOKFSTUDIO-LIFE-119
- SwRS-MDOKFSTUDIO-LIFE-125
---

## The side preview follows the active file and refreshes on demand

### Normative behavior

When a writer moves to another Markdown file, the Studio SHALL switch the side preview to that file and name it in the panel title, and, when a reader asks for a refresh, render the shown document again from its current text and keep the reading position.

### Preserved stakeholder intent

As a writer, I keep one preview beside my editor and it shows the Markdown file I am working in, without opening a new preview each time; as a reader, I redraw the preview myself when I doubt that it is current, and I stay where I was reading.

### Rationale and constraints

- Moving to a file that is not Markdown leaves the preview as it was, like the built-in Markdown preview.
- Switching quickly between files ends on the last file the writer chose.
- Refresh is offered as a command and as a toolbar button.
- A refresh never discards text that is being typed in an open editor of the preview without being asked: the toolbar button refuses while an editor is open.
