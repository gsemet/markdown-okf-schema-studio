---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-012
uuid: 3639da56-9aba-4cb4-9f7f-0098b252e3a2
title: The host posts the threads of the review comments file and follows its
  changes
description: When a document is shown or its review comments file is created,
  changed, deleted or written by the Studio, the extension SHALL post the
  current threads of the file to the page with their comments, anchors, resolved
  flags and orphaned verdicts, once for each distinct content and never from a
  read that a newer read overtook.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-001
- StRS-MDOKFSTUDIO-REVIEW-003
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/comments.ts
tested_in_files:
- test/integration/commentAnchors.test.ts
- test/integration/commentWrite.test.ts
- test/integration/reviewComments.test.ts
- test/session/reviewReqComments.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host posts the threads of the review comments file and follows its changes

### Normative behavior

When a document is shown or its review comments file is created, changed, deleted or written by the Studio, the extension SHALL post the current threads of the file to the page with their comments, anchors, resolved flags and orphaned verdicts, once for each distinct content and never from a read that a newer read overtook.

### Scenario (nominal): Valid file
- GIVEN a comments file with one thread quoting "second paragraph" whose comment body is `<b>Why?</b>`
- WHEN the preview renders
- THEN the page receives that thread with the body as stored

### Scenario (nominal): Orphan verdict
- GIVEN a thread whose quote the document no longer holds
- WHEN the threads are posted
- THEN the thread is posted with orphaned true and its stored lines

### Scenario (boundary): Document that is not a saved file
| Input | Outcome |
| --- | --- |
| A preview of an untitled document, or of another scheme than file | Nothing is posted, whatever files exist |
| A preview of a document saved as a file | The threads of its comments file are posted |

### Scenario (boundary): Document without a comments file
| Input | Outcome |
| --- | --- |
| A document with no comments file and no threads shown before | No previewComments message is posted |
| A preview that showed threads and whose comments file was deleted | An empty list is posted so the page removes them |

### Scenario (nominal): Change of the file outside the Studio
| Input | Outcome |
| --- | --- |
| A preview that shows two threads and a comments file rewritten with one thread, the file watcher fires | The page receives the one thread after a debounce of 150 ms |
| A comments file created next to a document that had none | The threads of the new file are posted |

### Scenario (refusal): The same threads are not posted twice
| Input | Outcome |
| --- | --- |
| A comment just written by the Studio, the file watcher reports the write | No second post is made |
| The same comments file text after the lines followed in memory were dropped (see SwRS-MDOKFSTUDIO-REVIEW-119) | The text is not skipped: the anchors are checked again, and a post is made only if the threads differ |
| A page that already shows the threads, the document renders again | The same threads are not posted again |

### Scenario (boundary): Read overtaken by a newer read
| Input | Outcome |
| --- | --- |
| Two changes of the comments file in quick succession, the first read ends after the second started | Only the result of the second read is posted |
| One change of the file, the read ends | Its result is posted |
| A post overtaken by a newer post while it checks the anchors against the document, both reading the same new text | The newer post shows the new threads; the overtaken one posts nothing and does not mark the text as shown |

### Scenario (boundary): The watch of the comments file is released
| Input | Outcome |
| --- | --- |
| The preview shows another document, so another comments file | The watcher of the previous file and its three change, create and delete subscriptions are all disposed; the live count stays at one watcher and three subscriptions |
| The preview closes | The watcher and its three subscriptions are disposed; disposing twice is harmless |

### Scenario (nominal): After a write by the host
| Input | Outcome |
| --- | --- |
| A comment just written, the write ends | The page receives the new list of threads |
| A refused change, the host answers | No new list is posted by the write |

### Scenario (refusal): Shape of the threads message the page accepts
| Input | Outcome |
| --- | --- |
| previewComments with a threads list of threads (id, anchor, resolved, createdAt, comments, optional boolean orphaned) and the render fields | The page shows the threads |
| previewComments whose threads is not a list | The page keeps no thread |
| A thread without a non-empty string id, with an anchor line that is not an integer of at least 1, or with comments that are not a list | The page drops that thread and keeps the others |
| More than 1000 threads, or more than 200 comments in a thread | The page keeps the first 1000 threads and the first 200 comments of a thread |
| A text that is not a string, or longer than 10 000 characters | The page uses an empty string, or the first 10 000 characters |

For an invalid file the host posts no thread and shows one warning, see SwRS-MDOKFSTUDIO-REVIEW-004.
The page accepts the message only when it is addressed to its render, see SwRS-MDOKFSTUDIO-TRUST-059.

### Related requirements
- SwRS-MDOKFSTUDIO-REVIEW-004: an invalid file posts no thread.
- SwRS-MDOKFSTUDIO-TRUST-059: the page accepts only registered host messages addressed to its render.

### Verification notes
- Method: test/integration/reviewComments.test.ts (valid file, document without a comments file, change of the file outside the Studio: follow change, creation, deletion; a saved file posts its threads). The non-file case (post returns early) and the 150 ms value (COMMENTS_DEBOUNCE_MS) are untested.
- Method: test/integration/commentAnchors.test.ts (orphan verdict: orphaned flags posted).
- Method: test/integration/commentWrite.test.ts (the echo of our own write is skipped; the last posted threads have two entries after two creates and zero after the last delete). The unchanged-threads render and the refusal case of a write are untested.
- Method: test/session/reviewReqComments.requirements.test.ts: a read of the comments file that a newer read overtook posts nothing (read overtaken by a newer read); `a post overtaken while it checks the anchors leaves the newer post free to show the new thread` (read overtaken by a newer read, same text).
- Method: test/session/reviewReqComments.requirements.test.ts: switching the sidecar and clearing a preview release the watcher and its three subscriptions (the watch of the comments file is released).
- Method: test/page/modules/commentThreads.test.ts: `T42: hostile ids and malformed threads are tolerated` (shape of the threads message the page accepts).
- Criteria: The last posted threads equal the file content, plus an orphaned flag for each thread; the post count stays 0 without a file and the last post is an empty list after a deletion; the threads shown by the page equal the file after each create, change and delete; the post count does not grow after an echo (comparison by the hash of the text, only while the lines followed in memory exist, and by the serialized threads); a read whose sequence number is no longer the latest returns before posting and before recording its text hash; post() returns before reading when the document uri does not start with file:.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-001](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-001.md): A reviewer reads review threads on the text, and unplaceable ones are kept
  - [StRS-MDOKFSTUDIO-REVIEW-003](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-003.md): A reviewer comments, replies, resolves and deletes, and no comment is lost
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-059](../trust-security/SwRS-MDOKFSTUDIO-TRUST-059.md): The page accepts only registered host messages addressed to its render
<!-- okf:links:end -->
