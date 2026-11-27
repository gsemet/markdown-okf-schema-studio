---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-223
uuid: bc1364f6-8edf-4bd8-9ac3-3a153a295d43
title: Saving one comment restyles few elements of a large document
description: When a reader saves one comment on a large document, the page SHALL
  recompute the style of at most 100 elements from the Save click until the
  highlight of the new comment is drawn.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-003
scenarios:
- id: S1
  title: One comment on the generated review document
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentLayoutStyles.ts
tested_in_files:
- test/page/commentRestyle.test.ts
default_owner_email: gaetan@xeberon.net
---

## Saving one comment restyles few elements of a large document

### Normative behavior

When a reader saves one comment on a large document, the page SHALL recompute the style of at most 100 elements from the Save click until the highlight of the new comment is drawn.

### Scenario S1 (nominal): One comment on the generated review document

- GIVEN the generated review document of `test/probe/perf547Document.ts` (464 lines, 22 tables, 11 images, 9 comment threads, about 3000 elements), each thread shown as a highlight
- WHEN a reader selects words of a paragraph, writes a comment, saves it and the host answers with the saved thread
- THEN from the Save click until two frames after the new highlight is drawn and the comment box is gone, the style passes of the page recompute at least one and at most 100 elements in total

### Related requirements

- SwRS-MDOKFSTUDIO-LAYOUT-043: no style rule tests the content root with `:has()`, which made every change inside it restyle the whole document.
- SwRS-MDOKFSTUDIO-REVIEW-044: the comment box and its save.

### Known issues

- Known issue: The limit is on the number of elements, counted in Chromium without a VS Code window. It sets no limit on the time a real window takes; the manual CI job `perf-547` measures that time and asserts no threshold.
- Known issue: Only the creation of a comment is counted; replying, resolving and deleting are not.

### Verification notes

- Method: test/page/commentRestyle.test.ts (`saving one comment on a large document restyles at most 100 elements`: the real preview in Chromium, the element counts of the `UpdateLayoutTree` trace events). It runs in the `visual` CI job (`just ci-visual 1`) and is skipped where no Chromium can start.
- Criteria: The sum of the counted elements is above 0 and at most 100, and the page holds one highlight more than before.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-003](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-003.md): A reviewer comments, replies, resolves and deletes, and no comment is lost
<!-- okf:links:end -->
