---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-006
uuid: c161871d-6b7b-41e7-a922-94144f866b87
title: Search and navigation unfold the folded section of their target
description: When the browser find reaches text inside a folded section, or the
  page navigates to an anchor, a table-of-contents entry or a link target inside
  one, the extension SHALL unfold the folded sections that contain the target
  before it is shown.
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: draft
status: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/scrollCore.ts
- src/page/modules/headingFold.ts
tested_in_files:
- test/page/modules/headingFold.test.ts
default_owner_email: gaetan@xeberon.net
---

## Search and navigation unfold the folded section of their target

### Normative behavior

When the browser find reaches text inside a folded section, or the page navigates to an anchor, a table-of-contents entry or a link target inside one, the extension SHALL unfold the folded sections that contain the target before it is shown.

### Scenario (nominal): The browser find opens the section
- GIVEN a folded section whose blocks are hidden="until-found"
- WHEN the browser find (Cmd/Ctrl+F) matches text in one of those blocks and the browser fires beforematch
- THEN the page unfolds every folded section that holds the block, and the match is shown

### Scenario (nominal): Navigation opens the section
- GIVEN a target inside a folded section
- WHEN a same-page link, a table-of-contents entry or an editor-to-preview navigation brings the page to the target
- THEN the folded sections that hold the target are unfolded and the layout is measured again before the page scrolls

### Scenario (boundary): Only the sections around the target open
| Input | Outcome |
| --- | --- |
| A target under a folded h1 and a folded h2 that both hold it | Both open |
| A folded section after the target, or a folded sibling section | It stays folded |
| A target that is not inside a folded section | Nothing changes and no layout pass runs |

### Verification notes

### Verification notes

- Method: test/page/modules/headingFold.test.ts (reveal unfolds the sections around a block and leaves the others folded, returns false when nothing was folded; the beforematch event unfolds the section).
- Criteria: after the reveal no block between the opened heading and the target carries data-okf-folded.
- Boundary: the browser find and the scroll to the target are not driven in a unit test; the real-window run of CR 143 covers a table-of-contents jump.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-002](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-002.md): The reader folds and unfolds the sections of the document
<!-- okf:links:end -->
