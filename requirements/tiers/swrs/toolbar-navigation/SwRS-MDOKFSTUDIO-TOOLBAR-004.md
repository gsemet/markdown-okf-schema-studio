---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-004
uuid: 54f9127c-c800-4bfa-89e6-d9560d2be284
title: The folded sections are a view state kept per document
description: When a section is folded or unfolded, the extension SHALL keep the
  folded headings of the document in the webview state by level, text and
  occurrence, apply them again after every content update and reload, and never
  change the document text.
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/state/headingFold.ts
- src/page/features/contentPatch.ts
- src/page/modules/headingFold.ts
tested_in_files:
- test/core/state/headingFold.test.ts
- test/page/modules/headingFold.test.ts
default_owner_email: gaetan@xeberon.net
---

## The folded sections are a view state kept per document

### Normative behavior

When a section is folded or unfolded, the extension SHALL keep the folded headings of the document in the webview state by level, text and occurrence, apply them again after every content update and reload, and never change the document text.

### Scenario (nominal): The folds survive a reload and a content update
- GIVEN a document with its h2 B folded
- WHEN the content is replaced by a content patch, or the page is loaded again in the same panel
- THEN B is folded again: the webview state holds headingFolds with the key 2|B|0 under the document id, and apply folds the heading with that key

### Scenario (boundary): Keys, documents and the file
| Input | Outcome |
| --- | --- |
| Two headings with the same level and text | Only the folded one is folded: the key ends with the occurrence number |
| Another document in the same panel | Its keys are kept apart under its own document id; at most 24 documents are kept and the oldest are dropped |
| A saved state that is not an object of string arrays | It is read as no folds |
| Any fold or unfold | The document text, the source file and the edit messages are unchanged |
| The last section of a document is unfolded | The document entry is removed from the state |

### Verification notes

- Method: test/core/state/headingFold.test.ts (key shape and occurrence, normalisation of a malformed state, replacement and bound of the per-document keys).
- Method: test/page/modules/headingFold.test.ts (the state written after a fold, other documents' keys kept, folds applied from the saved state and again on replaced content, the text of the blocks unchanged).
- Criteria: headingFolds in the webview state lists the folded keys of each document; nothing is posted to the host and no document edit is made.
