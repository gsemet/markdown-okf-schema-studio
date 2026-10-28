---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-004
uuid: c32d81b5-3127-439f-8baf-a804e175c540
title: A review comments file with any problem or over its limits is ignored
  with one warning
description: When any part of the review comments file of a shown document is
  not valid or goes over one of its limits, the extension SHALL read no thread
  from it, show one warning naming the file and the first problem once for each
  distinct content of the file, and refuse every change to it.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
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
- src/core/comments/commentStore.ts
- src/session/features/comments.ts
tested_in_files:
- test/core/comments/commentEditing.test.ts
- test/core/comments/commentModel.test.ts
- test/integration/commentWrite.test.ts
- test/integration/reviewComments.test.ts
default_owner_email: gaetan@xeberon.net
---

## A review comments file with any problem or over its limits is ignored with one warning

### Normative behavior

When any part of the review comments file of a shown document is not valid or goes over one of its limits, the extension SHALL read no thread from it, show one warning naming the file and the first problem once for each distinct content of the file, and refuse every change to it.

### Scenario (refusal): Wrong shape of the file
| Input | Outcome |
| --- | --- |
| An empty file | Error "the sidecar is not valid JSON"; no thread is returned |
| A file that is not JSON | Error "the sidecar is not valid JSON"; no thread is returned |
| A JSON array | Error "the sidecar must be a JSON object"; no thread is returned |
| A file of version 2 | Error "unsupported sidecar version (expected 1)"; no thread is returned |
| A file without a document name | Error "the sidecar needs a document name"; no thread is returned |
| A file without a threads list | Error "the sidecar needs a threads array"; no thread is returned |

### Scenario (refusal): One bad thread rejects the whole file
- GIVEN a file with one valid thread and a second thread with an empty id, a non-boolean resolved flag, a non-string body, a creation date that is not an ISO 8601 date-time with a zone ("yesterday" or "2026-13-45T99:00:00Z"), no comment, a line of 0, an endLine before its line, or the id of an earlier thread
- WHEN the file is read
- THEN an error is reported, the whole file is rejected and the valid thread is not returned either

### Scenario (boundary): Limits of the file
| Input | Outcome |
| --- | --- |
| A text of exactly 2 MiB or less | Read |
| A text of more than 2 MiB | Error "the sidecar is larger than 2097152 bytes"; no thread is returned |
| A comments file on disk larger than 2 MiB | The host does not read the file but hands the parser a stub of the limit length plus one, so the same error appears |
| Exactly 1000 valid threads | No error; 1000 threads are returned |
| 1001 threads | Error; no thread is returned |
| A thread with exactly 200 comments | No error |
| A thread with 201 comments | Error; no thread is returned |
| A comment body of exactly 10 000 characters | No error |
| A comment body of 10 001 characters | Error; no thread is returned |

### Scenario (refusal): First sight of an invalid file
- GIVEN a comments file that is not valid JSON
- WHEN its document is rendered
- THEN the warning "The review comments file {name} is not valid and is ignored: the sidecar is not valid JSON." is shown once and no thread is posted

### Scenario (boundary): Same content again
- GIVEN the same invalid content read again on the next render
- WHEN the threads are posted again
- THEN no second warning appears; changed invalid content warns again

### Scenario (refusal): Change while the file is not valid
- GIVEN a comments file holding {not json
- WHEN a comment is saved
- THEN the page is told the comments file is not valid and is left untouched, and the file text is unchanged

### Scenario (nominal): Change when the file is valid
- GIVEN a valid comments file
- WHEN a comment is saved
- THEN the change is written

### Related requirements
- SwRS-MDOKFSTUDIO-REVIEW-012: the host posts the threads of a valid file and nothing for an invalid one.

### Verification notes
- Method: test/core/comments/commentModel.test.ts: `T42: malformed JSON and wrong shapes give errors and no threads` (wrong shape), `T42: one invalid thread rejects the whole file` (one bad thread), `T42: limits on size, threads, comments and string length` (limits of the file for the parser; the host stub for a file on disk, readSidecar in src/session/features/comments.ts, is untested).
- Method: test/integration/reviewComments.test.ts asserts that an invalid file posts nothing ("an invalid file posts nothing", first sight). The warning text and the once-only rule are not asserted (untested).
- Method: test/core/comments/commentEditing.test.ts: `T43: an invalid existing file is never overwritten, and a refusal does not stop the queue`; test/integration/commentWrite.test.ts (invalid {not json is not overwritten and the reason matches not valid) (change while the file is not valid, change when the file is valid).
- Criteria: Every malformed input gives at least one error and an empty thread list; MAX_THREADS = 1000, MAX_COMMENTS_PER_THREAD = 200 and MAX_STRING_LENGTH = 10000 are accepted and one more is refused; the posted-threads count stays 0 and the warning calls showWarning once per distinct text (code inspection); the file bytes are identical after a refusal and the reason starts with "the comments file is not valid".
