---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-203
uuid: e65a9e80-9dd5-48da-8e84-5a5ac0cd8b70
title: The HEAD text comes from the built-in Git extension for small files
description: When the extension needs the text of a file at HEAD, it SHALL read
  it through the built-in Git extension without starting a process, return
  nothing when Git cannot give it or when the shown text, the document or the
  HEAD text is not a file under 1 MiB, and announce a change of the Git state
  only when the HEAD commit id has changed.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-017
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/host-vscode/headBaseline.ts
tested_in_files:
- test/host-vscode/headBaseline.test.ts
---

## The HEAD text comes from the built-in Git extension for small files

### Normative behavior

When the extension needs the text of a file at HEAD, it SHALL read it through the built-in Git extension without starting a process, return nothing when Git cannot give it or when the shown text, the document or the HEAD text is not a file under 1 MiB, and announce a change of the Git state only when the HEAD commit id has changed.

### Scenario (nominal): Git available

- GIVEN a repository with the file in HEAD
- WHEN the base is read
- THEN the commit id and the text are returned

### Scenario (refusal): Git missing or failing

- GIVEN no Git extension, no repository, no file in HEAD or a failing show
- WHEN the base is read
- THEN nothing is returned and nothing is marked

### Scenario (boundary): Only file documents under 1 MiB

| Input | Outcome |
| --- | --- |
| A shown text of more than 1 MiB | nothing is returned |
| A document that is not a file | nothing is returned |
| A file whose HEAD text is longer than 1 MiB (a big blob) | nothing is returned |

### Scenario (nominal): A new HEAD commit is announced

| Input | Outcome |
| --- | --- |
| A state change that moves HEAD to a new commit | the listener is called with the new commit id, once per commit change |
| A state change with the same commit id | no listener call is made |
| No repository, no Git extension or no active API | no listener call is made |

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-195: the host that compares the text with the shown text and posts the ranges.

### Verification notes

- Method: test/host-vscode/headBaseline.test.ts (unit tests `T16: no Git extension, no repository or a failing show give undefined`: scenario Git missing or failing; `T16: only file documents under 1 MB are compared, big blobs are skipped`: scenario only file documents under 1 MiB; `T16: a state change with the same commit id does not notify, a new commit does`, `T16: watch gives nothing without the extension, a repository or an active API`: scenario a new HEAD commit is announced). The scenario Git available is checked with the same test file (the commit id and the text are returned) and by the real window review-annotations/r03-incoming-change-bars.
- Criteria: read() returns undefined in the failing cases; MAX_BASELINE_BYTES = 1048576 gates the read; the listener runs once per commit change.
