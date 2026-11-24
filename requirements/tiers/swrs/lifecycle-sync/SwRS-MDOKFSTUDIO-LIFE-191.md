---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-191
uuid: b8e8dca1-d607-4cff-9667-ba738569249e
title: Links and Back and Next followed in the side preview mark their target
  line
description: When a link, Back or Next followed in the side preview that follows
  the editor opens another document at a line, the side preview SHALL mark that
  line once, and SHALL mark nothing for an anchor link or a Back or Next inside
  the same document.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-023
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/history.ts
- src/session/features/links.ts
tested_in_files:
- test/session/studioTabNavigation.test.ts
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## Links and Back and Next followed in the side preview mark their target line

### Normative behavior

When a link, Back or Next followed in the side preview that follows the editor opens another document at a line, the side preview SHALL mark that line once, and SHALL mark nothing for an anchor link or a Back or Next inside the same document.

### Scenario (nominal): A link with a line

- GIVEN a side preview that follows the editor
- WHEN the reader follows a link with a line or a heading fragment in it, or Back or Next to a line
- THEN the target opens in the text editor and the side preview marks the target line once

### Scenario (boundary): Link cases

| Input | Outcome |
| --- | --- |
| a link with no line | no marker |
| a link or Back or Next followed from a Studio tab, or from the side preview | the session always asks the host to show the document at the target line, and a Studio tab requests no marker |
| the selection the link asks for | it is recorded as Studio's own, so the jump signal does not mark it a second time |

### Verification notes

- Method: test/session/toolbarReq.requirements.test.ts ("a link with a fragment ...", "a link followed from a Studio tab ...", "a link to a Markdown file always opens a text editor at the target line ...", "Back to another Markdown document always opens a text editor at the stored line ...") and test/host/studioSelections.test.ts.
- Criteria: each outcome of the table above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
<!-- okf:links:end -->
