---
type: StRS
id: StRS-MDOKFSTUDIO-REVIEW-015
uuid: 3016ea7c-45cb-4985-b22a-62c27fcd6351
title: A writer keeps a discussion in the Markdown source and answers it from
  the preview
description: When a document holds an inline thread comment, the Studio SHALL
  show it as a thread chip that opens into its messages and lets the writer
  reply to it or delete it, and refuse a reply or a deletion while an edit is
  open, telling the writer to save or cancel the edit first.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I keep a discussion in the file itself and answer it
  where I read it, and I never have a thread change collide with the text I am
  typing.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-REVIEW-167
- SwRS-MDOKFSTUDIO-REVIEW-171
- SwRS-MDOKFSTUDIO-REVIEW-178
- SwRS-MDOKFSTUDIO-REVIEW-186
- SwRS-MDOKFSTUDIO-REVIEW-190
- SwRS-MDOKFSTUDIO-REVIEW-192
- SwRS-MDOKFSTUDIO-TRUST-065
---

## A writer keeps a discussion in the Markdown source and answers it from the preview

### Normative behavior

When a document holds an inline thread comment, the Studio SHALL show it as a thread chip that opens into its messages and lets the writer reply to it or delete it, and refuse a reply or a deletion while an edit is open, telling the writer to save or cancel the edit first.

### Preserved stakeholder intent

As a writer, I keep a discussion in the file itself and answer it where I read it, and I never have a thread change collide with the text I am typing.

### Rationale and constraints

- Only the lines of the thread change, in one undo step, and the line breaks of the document are kept.
- Read-only previews show the messages without controls.
- The refusal under an open edit is made by the page first; the host refuses again when an edit of the Markdown is open on its side.
