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
default_owner_email: gaetan@xeberon.net
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
  - [SwRS-MDOKFSTUDIO-REVIEW-167](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-167.md): An inline THREAD comment shows as a thread chip with its messages
  - [SwRS-MDOKFSTUDIO-REVIEW-171](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-171.md): An open inline thread offers Reply and Delete thread
  - [SwRS-MDOKFSTUDIO-REVIEW-178](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-178.md): An inline thread change message carries valid lines and a non-blank text
  - [SwRS-MDOKFSTUDIO-REVIEW-186](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-186.md): The host appends a reply inside the thread comment under the author
  - [SwRS-MDOKFSTUDIO-REVIEW-190](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-190.md): An empty or too long reply is refused by the host
  - [SwRS-MDOKFSTUDIO-REVIEW-192](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-192.md): Deleting an inline thread removes whole lines
  - [SwRS-MDOKFSTUDIO-TRUST-065](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
<!-- okf:links:end -->
