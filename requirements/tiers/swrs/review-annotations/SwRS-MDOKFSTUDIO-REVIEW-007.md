---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-007
uuid: f916db4b-9d64-4e0c-8d28-ab378e56f8eb
title: The side-by-side messages are validated and gated
description: When the page reports the side-by-side diff switch or the host
  posts a baseline, the protocol SHALL accept the page message only with a
  boolean on field for the current render, accept the host message only with an
  html string of at most 20 MiB and at most 100 000 hunks of non-negative
  integer lines whose ends are not more than one before their starts, and drop
  any other message.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-017
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-REVIEW-006, SwRS-MDOKFSTUDIO-REVIEW-009;
  no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
superseded_by:
- SwRS-MDOKFSTUDIO-REVIEW-006
- SwRS-MDOKFSTUDIO-REVIEW-009
---

## The side-by-side messages are validated and gated

### Normative behavior

When the page reports the side-by-side diff switch or the host posts a baseline, the protocol SHALL accept the page message only with a boolean on field for the current render, accept the host message only with an html string of at most 20 MiB and at most 100 000 hunks of non-negative integer lines whose ends are not more than one before their starts, and drop any other message.

### Scenario (nominal): Accepted messages

| Input | Outcome |
| --- | --- |
| previewSideBySideChanged with on true or false for the current render | accepted |
| previewBaselineDiff with an html string and hunks of non-negative integers whose ends are at least one before their starts | accepted for the current render |

### Scenario (boundary): Dropped messages

| Input | Outcome |
| --- | --- |
| previewSideBySideChanged with a non-boolean or no on | dropped |
| previewBaselineDiff with a non-string html, no hunks, a negative or fractional line, an end more than one before its start, or a null hunk | dropped |
| An html of more than 20 MiB, or more than 100 000 hunks | dropped |
| A message of a stale render | dropped |
### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-006: the host that posts the baseline.
- SwRS-MDOKFSTUDIO-REVIEW-008: the button that reports the switch.

### Verification notes

- Method: test/core/protocol/pageToHost.test.ts (`CR147: previewSideBySideChanged carries a boolean and names the current render`) and test/core/protocol/hostToPage.test.ts (`CR147: a baseline message needs an html string and well-formed hunks`, and the rule table tests that list previewBaselineDiff as a render message).
- Criteria: Each malformed message is rejected by its validator; a well-formed one passes the filter on the current page.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-017](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-017.md): A writer sees which blocks changed since the last commit
- Superseded by:
  - [SwRS-MDOKFSTUDIO-REVIEW-006](SwRS-MDOKFSTUDIO-REVIEW-006.md): The host posts the baseline rendering while the side-by-side diff is on and takes only a well-formed switch message
  - [SwRS-MDOKFSTUDIO-REVIEW-009](SwRS-MDOKFSTUDIO-REVIEW-009.md): A changed block shows as a side-by-side diff with its word marks, cut by line hunks, and a malformed baseline message is dropped
<!-- okf:links:end -->
