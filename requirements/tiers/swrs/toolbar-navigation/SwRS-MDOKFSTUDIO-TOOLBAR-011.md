---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-011
uuid: aa422620-11cf-4371-8974-152932df9b42
title: The find bar matches case, whole words and regular expressions
description: The find bar SHALL offer the options match case, whole word and
  regular expression, and SHALL report an invalid regular expression in place of
  the count instead of searching.
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
superseded_by:
- SwRS-MDOKFSTUDIO-TOOLBAR-010
---

## The find bar matches case, whole words and regular expressions

### Normative behavior

The find bar SHALL offer the options match case, whole word and regular expression, and SHALL report an invalid regular expression in place of the count instead of searching.

### Scenario (nominal): The three options
- GIVEN a page with "Studio" and "studio" in its text
- WHEN the reader turns on Match case (Alt+C), Whole word (Alt+W) or Regular expression (Alt+R)
- THEN the matches are searched again at once: match case keeps the same letter case, whole word needs a non-word character (letter, digit, underscore) on each side, and the expression is used as written

### Scenario (failure): An invalid expression
- GIVEN the regular expression option is on
- WHEN the field holds "stud(io"
- THEN the count shows the reason of the engine, the field is marked aria-invalid, nothing is painted and nothing is replaced

### Scenario (boundary): Literal queries
| Input | Outcome |
| --- | --- |
| A query with ".", "+", "(" or "/" and the expression option off | Plain text |
| A pattern that can match the empty string ("a*") | Empty matches are skipped |
| An empty query | No search, no count |

### Verification notes

- Method: test/core/find/findMatches.test.ts (literal escaping, case, whole word with accents and digits, expression, invalid expression, empty matches, the limit).
- Method: test/page/modules/findBar.test.ts (the toggles narrow the count, aria-pressed, an invalid expression shows its reason and aria-invalid, Alt+R).
- Criteria: the matches of each option combination equal the expected spans.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-003](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-003.md): The reader finds and replaces text in the preview
- Superseded by:
  - [SwRS-MDOKFSTUDIO-TOOLBAR-010](SwRS-MDOKFSTUDIO-TOOLBAR-010.md): The find bar paints the matches of the rendered text and walks them
<!-- okf:links:end -->
