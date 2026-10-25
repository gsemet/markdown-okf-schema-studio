---
type: StRS
id: StRS-MDOKFSTUDIO-PALETTE-013
uuid: fb3f5753-b060-495e-aaaa-a1285de7e958
title: A writer picks labels, documents, citations and code languages from host
  lists, with feedback
description: When a writer inserts a reference, a document link, a citation or a
  code block, the Studio SHALL offer the labels of the document, a file picker
  for documents, the keys of the bibliography files of the workspace, or exactly
  the languages the preview can highlight, write the matching role or fence, and
  answer every request for a list, a file or a conversion within a bounded time
  with the result or a reason the writer can read.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: "As a writer, I link to a label, a document or a bibliography entry by
  choosing it, not by typing its name from memory, choose a code language from a list
  and get a highlighted code block without trial and error, and never wait on an editor
  that is stuck: a refusal or a silent failure is explained and I can try again."
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-047
- SwRS-MDOKFSTUDIO-PALETTE-054
- SwRS-MDOKFSTUDIO-PALETTE-140
- SwRS-MDOKFSTUDIO-PALETTE-147
- SwRS-MDOKFSTUDIO-PALETTE-148
- SwRS-MDOKFSTUDIO-PALETTE-149
- SwRS-MDOKFSTUDIO-PALETTE-174
- SwRS-MDOKFSTUDIO-PALETTE-178
- SwRS-MDOKFSTUDIO-PALETTE-183
- SwRS-MDOKFSTUDIO-PALETTE-192
- SwRS-MDOKFSTUDIO-PALETTE-196
- SwRS-MDOKFSTUDIO-PALETTE-203
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-006
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
---

## A writer picks labels, documents, citations and code languages from host lists, with feedback

### Normative behavior

When a writer inserts a reference, a document link, a citation or a code block, the Studio SHALL offer the labels of the document, a file picker for documents, the keys of the bibliography files of the workspace, or exactly the languages the preview can highlight, write the matching role or fence, and answer every request for a list, a file or a conversion within a bounded time with the result or a reason the writer can read.

### Preserved stakeholder intent

Writers expect lists to come from the workspace, and a failure to be explained rather than silent.

As a writer, I link to a label, a document or a bibliography entry by choosing it, not by typing its name from memory, choose a code language from a list and get a highlighted code block without trial and error, and never wait on an editor that is stuck: a refusal or a silent failure is explained and I can try again.

### Rationale and constraints

- The scan of the bibliography files is bounded so that it never blocks a large repository.
- A preview that is not trusted does not read the workspace for citations or documents; it refuses what reads or writes files, and reading the labels of the open document stays allowed.
- A request answered after the editor closed is ignored.
- The language list includes the short names (aliases) of the languages; plain text is always offered first.
