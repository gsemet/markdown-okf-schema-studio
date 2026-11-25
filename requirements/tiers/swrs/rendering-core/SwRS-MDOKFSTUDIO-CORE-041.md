---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-041
uuid: 93d63231-240e-4a20-a067-c018f304c354
title: Right-to-left text aligns to the right and blocks get an automatic
  direction
description: When a paragraph, heading, list item, block quote or table cell
  holds text, the extension SHALL give it `dir="auto"` when it has no dir
  attribute and keep an author's dir attribute only as ltr, rtl or auto, so that
  Hebrew or Arabic text aligns to the right edge of the column.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
depends_on: []
scenarios:
- id: S1
  title: Text direction of a paragraph
- id: S2
  title: Block elements without a dir attribute
- id: S3
  title: Author dir attribute
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/security/html-sanitizer.ts
tested_in_files:
- test/page/coreReq.direction.requirements.test.ts
- test/security/html-policy.test.ts
default_owner_email: gaetan@xeberon.net
---

## Right-to-left text aligns to the right and blocks get an automatic direction

### Normative behavior

When a paragraph, heading, list item, block quote or table cell holds text, the extension SHALL give it `dir="auto"` when it has no dir attribute and keep an author's dir attribute only as ltr, rtl or auto, so that Hebrew or Arabic text aligns to the right edge of the column.

### Scenario S1 (nominal): Text direction of a paragraph
- GIVEN a Hebrew paragraph, then an English paragraph
- WHEN they are shown
- THEN the Hebrew text ends at the right edge of the column
- AND the English text starts at the left edge

### Scenario S2 (nominal): Block elements without a dir attribute
| Input | Outcome |
| --- | --- |
| a heading, a paragraph, a list item, a block quote, a table header cell and a table data cell without dir | each carries dir auto |
| a div without dir | gets no dir attribute |

### Scenario S3 (refusal): Author dir attribute
| Input | Outcome |
| --- | --- |
| paragraphs with dir rtl and dir RTL with a trailing space | both read dir rtl (lower case, without spaces) |
| a paragraph with dir evil | the attribute is gone and the diagnostic blocked-dir is recorded |

### Verification notes
- Method: test/security/html-policy.test.ts, test "emits dir=auto on block elements and keeps only ltr, rtl and auto" (block elements without a dir attribute, author dir attribute)
- Method: test/page/coreReq.direction.requirements.test.ts, test "a Hebrew paragraph ends at the right edge of the column and an English one starts at the left" (text direction of a paragraph, measured in Chromium on the built preview page; skipped where no Chromium starts)
- Criteria: Every dir attribute of the sanitized page is ltr, rtl or auto; the diagnostic blocked-dir is recorded for an unknown value; the right-to-left text of a paragraph aligns to the right without a dir attribute written by the author.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
<!-- okf:links:end -->
