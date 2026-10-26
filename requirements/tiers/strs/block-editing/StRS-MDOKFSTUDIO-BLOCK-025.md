---
type: StRS
id: StRS-MDOKFSTUDIO-BLOCK-025
uuid: 996e4b9c-9d5e-48eb-9deb-05e7354863f8
title: Preview edits land exactly, in one undo step, keep line endings, or are
  refused with a reason
description: When a writer's edit, move, cut or paste reaches the file, the
  Studio SHALL change exactly the lines the writer meant as one undo step with
  the line endings of the document and of the block kept, or refuse it with a
  reason the writer can read and leave the file and the clipboard as they were.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I trust that every change I make from the preview lands
  on the lines I meant, reverts with one undo and keeps the line endings of my
  document, or is refused with a reason, never landing on the wrong text; I am
  told why when an edit, move or paste cannot be done, and my document and
  clipboard are left untouched.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-003
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-042
- SwRS-MDOKFSTUDIO-BLOCK-053
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-BLOCK-069
- SwRS-MDOKFSTUDIO-BLOCK-094
- SwRS-MDOKFSTUDIO-BLOCK-109
- SwRS-MDOKFSTUDIO-BLOCK-117
- SwRS-MDOKFSTUDIO-BLOCK-124
- SwRS-MDOKFSTUDIO-BLOCK-127
- SwRS-MDOKFSTUDIO-BLOCK-129
- SwRS-MDOKFSTUDIO-BLOCK-130
- SwRS-MDOKFSTUDIO-BLOCK-156
- SwRS-MDOKFSTUDIO-BLOCK-166
- SwRS-MDOKFSTUDIO-BLOCK-169
- SwRS-MDOKFSTUDIO-BLOCK-174
- SwRS-MDOKFSTUDIO-BLOCK-191
- SwRS-MDOKFSTUDIO-BLOCK-205
- SwRS-MDOKFSTUDIO-BLOCK-216
- SwRS-MDOKFSTUDIO-BLOCK-227
- SwRS-MDOKFSTUDIO-BLOCK-232
- SwRS-MDOKFSTUDIO-BLOCK-233
- SwRS-MDOKFSTUDIO-BLOCK-234
- SwRS-MDOKFSTUDIO-BLOCK-235
- SwRS-MDOKFSTUDIO-BLOCK-236
- SwRS-MDOKFSTUDIO-BLOCK-237
- SwRS-MDOKFSTUDIO-BLOCK-238
- SwRS-MDOKFSTUDIO-BLOCK-239
- SwRS-MDOKFSTUDIO-BLOCK-240
- SwRS-MDOKFSTUDIO-BLOCK-241
- SwRS-MDOKFSTUDIO-BLOCK-242
- SwRS-MDOKFSTUDIO-BLOCK-243
- SwRS-MDOKFSTUDIO-BLOCK-244
- SwRS-MDOKFSTUDIO-BLOCK-245
- SwRS-MDOKFSTUDIO-BLOCK-252
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-059
- SwRS-MDOKFSTUDIO-TRUST-064
- SwRS-MDOKFSTUDIO-TRUST-065
---

## Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason

### Normative behavior

When a writer's edit, move, cut or paste reaches the file, the Studio SHALL change exactly the lines the writer meant as one undo step with the line endings of the document and of the block kept, or refuse it with a reason the writer can read and leave the file and the clipboard as they were.

### Preserved stakeholder intent

Writers expect the preview not to corrupt the file when the page and the file disagree.

Writers expect a refusal to be explained and harmless: a stale preview, a read-only preview, an included block, the frontmatter or another open edit.

Writers expect preview edits to join the undo history of the file in a few clear steps.

Writers expect the preview to leave line endings alone, so version control shows only the lines they changed.

As a writer, I trust that every change I make from the preview lands on the lines I meant, reverts with one undo and keeps the line endings of my document, or is refused with a reason, never landing on the wrong text; I am told why when an edit, move or paste cannot be done, and my document and clipboard are left untouched.

### Rationale and constraints

- A change that no longer fits the current text of the file is refused.
- A change is never half-applied.
- The text a writer typed stays in the editor when a save is refused.
- Autosaves of one session merge into one undo step in a text editor that shows the file; moves, cuts and pastes use explicit undo stops.
- Known issue (deduced from the code, not run): a multi-line block of a CRLF document may have its second save refused (see SwRS-MDOKFSTUDIO-BLOCK-234).
