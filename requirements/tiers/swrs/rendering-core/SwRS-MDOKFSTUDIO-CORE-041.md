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
- StRS-MDOKFSTUDIO-TRUST-006
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/security/html-sanitizer.ts
tested_in_files:
- test/security/html-policy.test.ts
default_owner_email: gaetan@xeberon.net
---

## Right-to-left text aligns to the right and blocks get an automatic direction

### Normative behavior

When a paragraph, heading, list item, block quote or table cell holds text, the extension SHALL give it `dir="auto"` when it has no dir attribute and keep an author's dir attribute only as ltr, rtl or auto, so that Hebrew or Arabic text aligns to the right edge of the column.

### Scenario (nominal): Text direction of a paragraph
- GIVEN a Hebrew paragraph, then an English paragraph
- WHEN they are shown
- THEN the Hebrew text ends at the right edge of the column
- AND the English text starts at the left edge

### Scenario (nominal): Block elements without a dir attribute
| Input | Outcome |
| --- | --- |
| a heading, a paragraph, a list item, a block quote, a table header cell and a table data cell without dir | each carries dir auto |
| a div without dir | gets no dir attribute |

### Scenario (refusal): Author dir attribute
| Input | Outcome |
| --- | --- |
| paragraphs with dir rtl and dir RTL with a trailing space | both read dir rtl (lower case, without spaces) |
| a paragraph with dir evil | the attribute is gone and the diagnostic blocked-dir is recorded |

### Verification notes
- Method: test/security/html-policy.test.ts, test "emits dir=auto on block elements and keeps only ltr, rtl and auto" (all scenarios; the alignment itself follows from dir auto and is not measured by a named test)
- Criteria: Every dir attribute of the sanitized page is ltr, rtl or auto; the diagnostic blocked-dir is recorded for an unknown value; the right-to-left text of a paragraph aligns to the right without a dir attribute written by the author.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
  - [StRS-MDOKFSTUDIO-TRUST-006](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-006.md): The preview runs no foreign code and unsafe HTML is made inert
<!-- okf:links:end -->
