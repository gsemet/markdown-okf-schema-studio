---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-097
uuid: ee78ae4d-4030-4892-91d5-75bc9a6cc958
title: Code fences and front matter are read the same way everywhere
description: When the extension reads a Markdown source to render it, to anchor
  a review comment, to resolve a link fragment or to list label targets, it
  SHALL find a code fence only at up to three spaces of indent, close it only
  with a fence of the same mark, at least as long, followed by nothing but white
  space, and find the front matter only as a first-line "---" marker closed by a
  "---" or "..." line, so that every one of them sees the same lines as code or
  front matter.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-005
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/syntax/markdownSyntax.ts
tested_in_files:
- test/core/syntax/markdownSyntax.test.ts
default_owner_email: gaetan@xeberon.net
---

## EARS Expression

### Normative behavior

When the extension reads a Markdown source to render it, to anchor a review comment, to resolve a link fragment or to list label targets, it SHALL find a code fence only at up to three spaces of indent, close it only with a fence of the same mark, at least as long, followed by nothing but white space, and find the front matter only as a first-line "---" marker closed by a "---" or "..." line, so that every one of them sees the same lines as code or front matter.

### Scenario (nominal): A fence ends only at a matching closing fence
- GIVEN a source with a ```` ``` ```` fence closed by a line of three backticks and a label, a comment target or an alert after it
- WHEN the preview renders, a comment is anchored or a link fragment is resolved
- THEN the lines inside the fence are code for each of them and the lines after it are content

### Scenario (boundary): Indent, info string, length and mark
| Input | Outcome |
| --- | --- |
| A fence indented by four spaces or more | not a fence; the line is content |
| A closing line with an info string (```` ```js ````) | does not close the fence |
| A closing fence shorter than the opening one, or of the other mark | does not close the fence |
| A closing fence longer than the opening one, or with trailing spaces | closes the fence |

### Scenario (boundary): Front matter
| Input | Outcome |
| --- | --- |
| `---` on the first line, closed by `---` or `...` (trailing spaces allowed) | the lines between are front matter, not content |
| An opening `---` that is indented, or never closed | not front matter; the lines are content |
| An indented closing marker | does not close the front matter |

### Verification notes

- Method: one table test run through comment anchoring, link-fragment navigation, label targets, GitHub alerts and the first-heading scan.
- Criteria: every consumer gives the same answer for every row of the tables above.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-005](../../strs/myst/StRS-MDOKFSTUDIO-MYST-005.md): Build-dependent constructs appear as labelled placeholders
<!-- okf:links:end -->
