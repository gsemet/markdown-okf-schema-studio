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
req_lifecycle: proposed
status: stable
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
default_owner_email: gaetan@xeberon.net
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

### Main paths

#### Path 1: Refer to a label of the document

1. The palette is shown above the text box
   - SwRS-MDOKFSTUDIO-PALETTE-140: the writer presses Reference and a popover opens with a filter field, showing Loading... until the host answers
2. The host is asked for the labels
   - SwRS-MDOKFSTUDIO-PALETTE-178: the host lists the (name)= lines of the document that lie outside code fences
   - Option SwRS-MDOKFSTUDIO-PALETTE-178 (refusal): lines inside fences and bad names are not listed
3. The labels are listed
   - SwRS-MDOKFSTUDIO-PALETTE-147: the writer chooses a label and {ref} with the label in backticks is written in place of the selection
   - Option SwRS-MDOKFSTUDIO-PALETTE-140 (boundary): the list is empty, the host fails, or the list is cut
4. A ref role is in the text

#### Path 2: Fence code in a language

1. The palette is shown above the text box
   - SwRS-MDOKFSTUDIO-PALETTE-054: the writer presses Code block and a menu lists text, then each language the preview highlights, once and sorted
2. The language menu is open
   - SwRS-MDOKFSTUDIO-PALETTE-054: the writer chooses a language and the touched lines are wrapped in a fence of that language
   - Option SwRS-MDOKFSTUDIO-PALETTE-054 (refusal): no language or an invalid language name
3. The lines are wrapped in a fenced code block

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-047](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-047.md): Done, Cmd/Ctrl+Enter or leaving the text box commits the edit
  - [SwRS-MDOKFSTUDIO-PALETTE-054](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-054.md): The Code block list wraps lines in a fence of a highlighted language
  - [SwRS-MDOKFSTUDIO-PALETTE-140](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-140.md): Reference and Citation open a filterable list filled by the host
  - [SwRS-MDOKFSTUDIO-PALETTE-147](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-147.md): A chosen label is written as a ref role
  - [SwRS-MDOKFSTUDIO-PALETTE-148](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-148.md): Document link picks a Markdown file and writes a doc role
  - [SwRS-MDOKFSTUDIO-PALETTE-149](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-149.md): A chosen bibliography key is written as a cite role
  - [SwRS-MDOKFSTUDIO-PALETTE-174](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-174.md): The host drops a request that does not name the render it holds
  - [SwRS-MDOKFSTUDIO-PALETTE-178](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-178.md): The host lists the label targets of the document
  - [SwRS-MDOKFSTUDIO-PALETTE-183](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-183.md): The host scans nearby bibliography files for citation keys within bounds
  - [SwRS-MDOKFSTUDIO-PALETTE-192](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-192.md): The host image picker answers a path relative to the document
  - [SwRS-MDOKFSTUDIO-PALETTE-196](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-196.md): The host saves a pasted image next to the document under a name it chooses
  - [SwRS-MDOKFSTUDIO-PALETTE-203](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-203.md): A pasted image is sent to the host and its name inserted on its own paragraph
  - [SwRS-MDOKFSTUDIO-TRUST-005](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host handles the write requests of every preview, whatever the trust
  - [SwRS-MDOKFSTUDIO-TRUST-006](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-006.md): A preview with restricted reads keeps every viewing action
  - [SwRS-MDOKFSTUDIO-TRUST-065](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-TRUST-090](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-090.md): Every page request is answered once by its id and result type, or ends with a readable error
<!-- okf:links:end -->
