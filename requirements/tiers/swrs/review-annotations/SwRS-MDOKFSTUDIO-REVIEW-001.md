---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-001
uuid: 7f08a4df-482b-4b04-8d78-a19cc135218d
title: The review comments file next to a document holds its threads as data
description: When a document is shown, the extension SHALL look for its review
  threads in a file with the name of the document, its extension replaced by
  .comments.json, in the same folder, read them as plain data with only the
  fields of the format, and write them back in one stable form.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-001
- StRS-MDOKFSTUDIO-REVIEW-003
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/comments/commentModel.ts
- src/page/modules/commentThreads.ts
tested_in_files:
- test/core/comments/commentModel.test.ts
- test/integration/reviewComments.test.ts
- test/page/modules/commentThreads.test.ts
default_owner_email: gaetan@xeberon.net
---

## The review comments file next to a document holds its threads as data

### Normative behavior

When a document is shown, the extension SHALL look for its review threads in a file with the name of the document, its extension replaced by .comments.json, in the same folder, read them as plain data with only the fields of the format, and write them back in one stable form.

### Scenario (nominal): Name of the comments file
- GIVEN documents named notes.md, notes and a.b.md in a folder
- WHEN the extension looks for their review threads
- THEN it reads notes.comments.json, notes.comments.json and a.b.comments.json in the same folder

### Scenario (nominal): Valid file
- GIVEN a file with version 1, the document name notes.md and one thread with an anchor, a resolved flag, an ISO creation date and one comment
- WHEN the file is read
- THEN one thread is returned with its quote, its author and its body

### Scenario (boundary): Unknown fields
- GIVEN a file whose thread, anchor and comments carry fields the format does not name
- WHEN the file is read
- THEN the threads are returned without those fields and the unknown top-level fields are not kept

### Scenario (boundary): Text that looks like markup
| Input | Outcome |
| --- | --- |
| A comment body and an author name that contain an img tag with an onerror attribute, a control character and a template expression | The strings are returned unchanged as data; a polluting __proto__ key does not reach other objects |
| A thread whose comment body is an HTML tag, shown in the thread popover | The tag is shown as text and no element is created from it |

### Scenario (nominal): Stable written form
| Input | Outcome |
| --- | --- |
| A file whose keys come in another order, read and written again | The text equals the one written from the canonical order, starting with version, document and threads, with a 2-space indent and a trailing newline |
| The text the extension wrote, read and written again | The second text equals the first |

### Related requirements
- SwRS-MDOKFSTUDIO-REVIEW-004: a file with any problem yields no thread at all.

### Verification notes
- Method: test/core/comments/commentModel.test.ts: `T42: sidecarNameFor puts .comments.json next to the document` (name of the comments file), `T42: a valid file parses into threads` (valid file), `T42: hostile strings stay plain data and unknown fields are dropped` (unknown fields, text that looks like markup), `T42: serialization is stable: fixed key order, 2 spaces, trailing newline` (stable written form).
- Method: test/page/modules/commentThreads.test.ts: `T42: the popover shows author, date and bodies as text, never as HTML`, `T42: hostile ids and malformed threads are tolerated` (text that looks like markup, popover row).
- Method: test/integration/reviewComments.test.ts reads a comments file next to its document and posts the body `<b>Why?</b>` as stored (name of the comments file, valid file, text that looks like markup).
- Criteria: The name function returns the stem of the file name plus .comments.json in the same directory for names with and without an extension; a valid file parses with no error and fields outside the format are absent from the result; the parsed strings equal the input and the popover holds text nodes only; the serialized text starts with the expected 2-space layout, ends with a closing brace and a newline, and is a fixed point of parse then serialize.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-001](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-001.md): A reviewer reads review threads on the text, and unplaceable ones are kept
  - [StRS-MDOKFSTUDIO-REVIEW-003](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-003.md): A reviewer comments, replies, resolves and deletes, and no comment is lost
<!-- okf:links:end -->
