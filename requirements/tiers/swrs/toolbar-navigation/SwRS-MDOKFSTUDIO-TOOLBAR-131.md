---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-131
uuid: db5105ed-9535-4664-a1e1-0fab7353313f
title: Replace all announces the matches it will skip
description: When the find bar holds a query and its replace row is open, the
  extension SHALL count in its note, before any replacement, the matches that
  cannot be replaced from the preview.
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
- src/page/modules/findBar.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
- test/page/modules/findBar.test.ts
- test/session/reviewReqThreads.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## Replace all announces the matches it will skip

### Normative behavior

When the find bar holds a query and its replace row is open, the extension SHALL count in its note, before any replacement, the matches that cannot be replaced from the preview.

### Scenario (nominal): The note counts the skipped matches before the click
- GIVEN a writable preview, the replace row open, and a query with matches of which the page cannot map some (front matter, an included file, a formula) and the host would skip others (an admonition title, markup inside the match)
- WHEN the reader types the query, opens the replace row, or the content is refreshed
- THEN 150 ms after the last of these the page asks the host to plan Replace all of every mapped match without applying it (the `previewFindReplace` request with `dryRun: true` and an empty replacement text: the counts do not depend on it), the host answers the counts of the plan without editing the document, and the note reads "N matches cannot be replaced from the preview", N being the page's unmapped matches plus the host's skipped ones

### Scenario (boundary): When the page does not ask, and stale or refused answers
| Input | Outcome |
| --- | --- |
| The replace row is closed (the reader only searches) | No request; the note counts the page's unmapped matches only |
| The replace row is closed again | The host's count is dropped; the note counts the page's unmapped matches only |
| Another search, an option toggle or a content refresh before the answer | The older answer is ignored; a new request follows 150 ms later |
| Several searches within 150 ms | One request, for the last one |
| A read-only preview or an open edit | No request from the page; the host refuses a dry run with its reason, and the note keeps the page's count |
| The host refuses or the request times out | The note keeps the page's count |
| No mapped match maps to the source | The host answers every sent match as skipped |
| A replacement in flight | No request; the next search after it asks again |
| A replacement text longer than a replace accepts | The request is sent all the same (it holds no replacement text); the click refuses the replacement as too long |
| The reader clicks Replace or Replace all | The note after the answer still reads "Replaced R matches; N matches cannot be replaced from the preview" (SwRS-MDOKFSTUDIO-TOOLBAR-012) |

### Verification notes

- Method: test/page/modules/findBar.test.ts (with the replace row open the page sends one dry-run request 150 ms after the last search and the note then counts the host's skipped matches; a refresh drops the count and asks again; no request while the row is closed, closing the row drops the count; a stale answer and a refusal keep the page's count; the request holds an empty replacement and is sent with a replacement too long to apply).
- Method: test/core/protocol/pageToHost.test.ts (the optional boolean `dryRun` flag of `previewFindReplace`).
- Method: test/session/reviewReqThreads.requirements.test.ts (a dry run answers the counts of the plan, answers every match as skipped when nothing maps, never applies an edit, and is refused in a read-only preview).
- Criteria: before any click, the note counts exactly the matches a Replace all would not replace, and the document is unchanged by the dry run.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-003](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-003.md): The reader finds and replaces text in the preview
<!-- okf:links:end -->
