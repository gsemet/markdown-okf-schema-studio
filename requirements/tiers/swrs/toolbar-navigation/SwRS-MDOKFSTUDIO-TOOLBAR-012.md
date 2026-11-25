---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-012
uuid: fb1ba5df-5ea9-46ef-ae07-db78070c19e7
title: Replace edits only the matched source spans
description: "When the reader replaces matches from the find bar, the extension SHALL
  replace the source span of each match that maps one-to-one to the source, and no
  other text, in one undo step; the extension SHALL refuse every replacement with
  the reason, without editing the document, while a block editor is open (the find
  bar keeps finding), and, while the find bar holds a query and its replace row is
  open, count in its note, before any replacement, the matches that cannot be replaced
  from the preview."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-003
depends_on: []
scenarios:
- id: S1
  title: Replace one and replace all
- id: S2
  title: Matches that do not map one-to-one to the source
- id: S3
  title: The note and the rest of the file
- id: S4
  title: Open editor
- id: S5
  title: The host refuses
- id: S6
  title: The note counts the skipped matches before the click
- id: S7
  title: When the page does not ask, and stale or refused answers
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
- test/integration/realInput/qa210Replays.ts
- test/page/modules/findBar.test.ts
- test/session/findReplace.test.ts
- test/visual/capture_find_checks.py
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-TOOLBAR-014
- SwRS-MDOKFSTUDIO-TOOLBAR-131
---

## Replace edits only the matched source spans

### Normative behavior

When the reader replaces matches from the find bar, the extension SHALL replace the source span of each match that maps one-to-one to the source, and no other text, in one undo step; the extension SHALL refuse every replacement with the reason, without editing the document, while a block editor is open (the find bar keeps finding), and, while the find bar holds a query and its replace row is open, count in its note, before any replacement, the matches that cannot be replaced from the preview.

### Scenario S1 (nominal): Replace one and replace all
- GIVEN the bar holds a query with matches in a heading and two paragraphs, a replacement text and a preview
- WHEN the reader presses Replace (or Enter in the replace field), or Replace all (Cmd/Ctrl+Alt+Enter)
- THEN the page sends, for each match, the source lines of its block, the matched text, which occurrence of it that is, and the final replacement text (with the "$1" groups of a regular expression expanded); the host replaces exactly those source spans, all in one undo step, and answers with the number replaced and skipped

### Scenario S2 (boundary): Matches that do not map one-to-one to the source
| Input | Outcome |
| --- | --- |
| A match in a link label whose target or title repeats the text (`[needle](https://example.com/needle)`) | Replaced; the target and the title are kept: link and image targets and titles, a whole inline image, alt text included (the page does not show it) and reference definition lines (`[label]: url`) are left out of the source occurrences |
| The text inside an inline image's alt text or a reference definition | Neither counted nor replaced |
| The text of an autolink (`<https://example.com/needle>`) or of a link written in a code span | Counted and replaced: the reader sees it |
| A link or a reference definition inside a fenced code block (``` or ~~~), or a definition line indented by 4 spaces or a tab | Counted as code text; the fence's info string is counted too, so a match whose block shows fewer occurrences than its source is skipped |
| A link written inside the label of another link | Only the inner link's target is left out: Markdown shows the outer target as text |
| A match in a formula, in generated text (an admonition title), or across markup | Skipped: the visible source holds another number of occurrences than the page shows |
| A match in the front matter, an included file or outside a mapped block | Not sent; counted by the page |
| A matched line break of a wrapped paragraph | The source span runs over the line break and the whole span is replaced |
| Two edits that overlap | The later one is skipped |
| Every match skipped | The host refuses with a reason and the document is unchanged |

### Scenario S3 (boundary): The note and the rest of the file
- GIVEN a replacement in which the page or the host skipped N matches
- WHEN the answer arrives
- THEN the note of the bar reads "Replaced R matches; N matches cannot be replaced from the preview", and everything outside the replaced spans is byte-identical, the host having checked the lines and the revision again

### Scenario S4 (failure): Open editor
- GIVEN a preview with a block editor open, whatever the trust
- WHEN the reader opens the replace row or presses Replace or Replace all
- THEN the replace controls are marked aria-disabled with the reason as title, the note shows the reason, the host is not asked and the document is unchanged; finding keeps working

### Scenario S5 (failure): The host refuses
- GIVEN a request that reaches the host with a Markdown edit open or from an older render
- WHEN the host handles it
- THEN it answers with the reason and does not read or change the document

### Scenario S6 (nominal): The note counts the skipped matches before the click
- GIVEN a preview, the replace row open, and a query with matches of which the page cannot map some (front matter, an included file, a formula) and the host would skip others (an admonition title, markup inside the match)
- WHEN the reader types the query, opens the replace row, or the content is refreshed
- THEN 150 ms after the last of these the page asks the host to plan Replace all of every mapped match without applying it (the `previewFindReplace` request with `dryRun: true` and an empty replacement text: the counts do not depend on it), the host answers the counts of the plan without editing the document, and the note reads "N matches cannot be replaced from the preview", N being the page's unmapped matches plus the host's skipped ones

### Scenario S7 (boundary): When the page does not ask, and stale or refused answers
| Input | Outcome |
| --- | --- |
| The replace row is closed (the reader only searches) | No request; the note counts the page's unmapped matches only |
| The replace row is closed again | The host's count is dropped; the note counts the page's unmapped matches only |
| Another search, an option toggle or a content refresh before the answer | The older answer is ignored; a new request follows 150 ms later |
| Several searches within 150 ms | One request, for the last one |
| An open edit | No request from the page; the host refuses a dry run with its reason, and the note keeps the page's count |
| The host refuses or the request times out | The note keeps the page's count |
| No mapped match maps to the source | The host answers every sent match as skipped |
| A replacement in flight | No request; the next search after it asks again |
| A replacement text longer than a replace accepts | The request is sent all the same (it holds no replacement text); the click refuses the replacement as too long |
| The reader clicks Replace or Replace all | The note after the answer still reads "Replaced R matches; N matches cannot be replaced from the preview" (SwRS-MDOKFSTUDIO-TOOLBAR-012) |

### Verification notes

- Method: test/core/edits/findReplace.test.ts (the span of the occurrence, markup around it kept, a wrapped line break, skipped and counted matches, overlaps, nothing to replace, a replacement with "$"; a list whose link target repeats the query has both visible matches replaced and its target kept; link titles, angle-bracket targets and targets with parentheses; an inline image left out as a whole; a reference definition left out and a footnote definition counted; an autolink and a link in a code span counted; a link and a definition in a backtick or tilde fence counted, a fence's info string never taken for the visible match; a definition indented by 4 spaces or a tab counted, by 3 spaces left out; no link inside a link).
- Method: test/core/find/findMatches.test.ts (expansion of "$1", "$&", the named group form and "$$").
- Method: test/core/protocol/pageToHost.test.ts (the validator of the request) and test/session/reviewReqThreads.requirements.test.ts (the host applies the edits as one call and answers with the counts).
- Method: test/page/modules/findBar.test.ts (items sent for replace and replace all, the note with the skipped count, the host's refusal shown); test/visual/capture_find_checks.py (the replace request of every visual page, the dry run left aside).
- Method: test/integration/findInPreview.test.ts, real VS Code window (replace all edits the document at the matched spans only, a link label is replaced and its target kept, a match split by markup is skipped and counted in the note, one undo restores the file); repeated by the `stress` CI job as `find-in-preview` (test/shared/stressPlan.ts).
- Criteria: the document after the edits equals the source with exactly the matched spans replaced.
- Method: test/page/modules/findBar.test.ts (the replace toggle is disabled with the reason, the row stays closed, finding works, the host is not asked).
- Method: test/session/reviewReqThreads.requirements.test.ts (an open edit is refused before the document is read; a preview with restricted reads applies the replacement) and test/session/trustReq.requirements.test.ts (an older render is answered with the out-of-date reason).
- Criteria: no edit is applied and the answer carries the reason.
- Method: test/page/modules/findBar.test.ts (with the replace row open the page sends one dry-run request 150 ms after the last search and the note then counts the host's skipped matches; a refresh drops the count and asks again; no request while the row is closed, closing the row drops the count; a stale answer and a refusal keep the page's count; the request holds an empty replacement and is sent with a replacement too long to apply).
- Method: test/core/protocol/pageToHost.test.ts (the optional boolean `dryRun` flag of `previewFindReplace`).
- Method: test/session/reviewReqThreads.requirements.test.ts (a dry run answers the counts of the plan, answers every match as skipped when nothing maps, never applies an edit, and is answered in a preview with restricted reads like in any other).
- Criteria: before any click, the note counts exactly the matches a Replace all would not replace, and the document is unchanged by the dry run.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-003](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-003.md): The reader finds and replaces text in the preview
- Supersedes:
  - [SwRS-MDOKFSTUDIO-TOOLBAR-014](SwRS-MDOKFSTUDIO-TOOLBAR-014.md): Replace is unavailable while a block editor is open
  - [SwRS-MDOKFSTUDIO-TOOLBAR-131](SwRS-MDOKFSTUDIO-TOOLBAR-131.md): Replace all announces the matches it will skip
<!-- okf:links:end -->
