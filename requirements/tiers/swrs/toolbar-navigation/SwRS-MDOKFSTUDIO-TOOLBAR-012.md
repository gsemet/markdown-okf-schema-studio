---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-012
uuid: fb1ba5df-5ea9-46ef-ae07-db78070c19e7
title: Replace edits only the matched source spans
description: When the reader replaces matches from the find bar, the extension
  SHALL replace the source span of each match that maps one-to-one to the
  source, and no other text, in one undo step.
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/edits/findReplace.ts
- src/core/find/findMatches.ts
- src/core/protocol/pageToHost.ts
- src/page/modules/findBar.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/core/edits/findReplace.test.ts
- test/core/find/findMatches.test.ts
- test/core/protocol/pageToHost.test.ts
- test/integration/findInPreview.test.ts
- test/page/modules/findBar.test.ts
- test/session/reviewReqThreads.requirements.test.ts
- test/visual/capture_find_checks.py
default_owner_email: gaetan@xeberon.net
---

## Replace edits only the matched source spans

### Normative behavior

When the reader replaces matches from the find bar, the extension SHALL replace the source span of each match that maps one-to-one to the source, and no other text, in one undo step.

### Scenario (nominal): Replace one and replace all
- GIVEN the bar holds a query with matches in a heading and two paragraphs, a replacement text and a writable preview
- WHEN the reader presses Replace (or Enter in the replace field), or Replace all (Cmd/Ctrl+Alt+Enter)
- THEN the page sends, for each match, the source lines of its block, the matched text, which occurrence of it that is, and the final replacement text (with the "$1" groups of a regular expression expanded); the host replaces exactly those source spans, all in one undo step, and answers with the number replaced and skipped

### Scenario (boundary): Matches that do not map one-to-one to the source
| Input | Outcome |
| --- | --- |
| A match in a link label whose target repeats the text, in a formula, in generated text (an admonition title), or across markup | Skipped: the source holds another number of occurrences than the page shows |
| A match in the front matter, an included file or outside a mapped block | Not sent; counted by the page |
| A matched line break of a wrapped paragraph | The source span runs over the line break and the whole span is replaced |
| Two edits that overlap | The later one is skipped |
| Every match skipped | The host refuses with a reason and the document is unchanged |

### Scenario (boundary): The note and the rest of the file
- GIVEN a replacement in which the page or the host skipped N matches
- WHEN the answer arrives
- THEN the note of the bar reads "Replaced R matches; N matches cannot be replaced from the preview", and everything outside the replaced spans is byte-identical, the host having checked the lines and the revision again

### Verification notes

- Method: test/core/edits/findReplace.test.ts (the span of the occurrence, markup around it kept, a wrapped line break, skipped and counted matches, overlaps, nothing to replace, a replacement with "$").
- Method: test/core/find/findMatches.test.ts (expansion of "$1", "$&", the named group form and "$$").
- Method: test/core/protocol/pageToHost.test.ts (the validator of the request) and test/session/reviewReqThreads.requirements.test.ts (the host applies the edits as one call and answers with the counts).
- Method: test/page/modules/findBar.test.ts (items sent for replace and replace all, the note with the skipped count, the host's refusal shown).
- Method: test/integration/findInPreview.test.ts, real VS Code window (replace all edits the document at the matched spans only, one undo restores the file); repeated by the `stress` CI job as `find-in-preview` (test/shared/stressPlan.ts).
- Criteria: the document after the edits equals the source with exactly the matched spans replaced.
