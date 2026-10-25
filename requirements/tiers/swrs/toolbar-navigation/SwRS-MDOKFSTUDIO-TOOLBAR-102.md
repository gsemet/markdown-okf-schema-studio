---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-102
uuid: 3f8945c3-c1b2-46a4-b5dd-38f41f73acb8
title: "A link fragment selects a source line, block id, label, heading or field"
description: "When a followed link names a fragment or a frontmatter marker, the extension
  SHALL select the first source line outside fenced code blocks that the fragment
  names (#L{n} or #L{n}-L{m} lines, #^{id} block id, a MyST (label)= line, an explicit
  {#id}, an HTML heading id or the slug of an ATX or setext heading) or that holds
  the marker followed by the exact identity, and select nothing when no line matches."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-011
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/navigation/previewNavigation.ts
tested_in_files:
- test/core/navigation/previewNavigation.test.ts
- test/session/links.test.ts
---

## A link fragment selects a source line, block id, label, heading or field

### Normative behavior

When a followed link names a fragment or a frontmatter marker, the extension SHALL select the first source line outside fenced code blocks that the fragment names (#L{n} or #L{n}-L{m} lines, #^{id} block id, a MyST (label)= line, an explicit {#id}, an HTML heading id or the slug of an ATX or setext heading) or that holds the marker followed by the exact identity, and select nothing when no line matches.

### Scenario (nominal): Single line and range

- GIVEN #L4 and #L11-L12 on a 12-line file
- WHEN the fragment is resolved
- THEN lines 4 and 11 to 12 are selected

### Scenario (nominal): Block id, label and heading targets

| Input | Outcome |
| --- | --- |
| #^block-id and a paragraph ending ^block-id | that line is selected (the id is preceded by the start of the line or whitespace) |
| #intro and a line (intro)= | the label line is selected (label characters are letters, digits, _ . : and -) |
| #my-heading, #My%20Heading and #explicit-id | the first matching heading line is selected for each (slug: lower case, punctuation removed, spaces to hyphens) |
| a heading with an HTML id equal to the fragment | the heading line is selected |
| a file with CRLF line ends and a heading fragment | the heading line is selected |

### Scenario (boundary): Lines inside a fenced example

| Input | Outcome |
| --- | --- |
| a heading inside a fence and the same heading outside, its slug resolved | the line outside the fence is selected |
| #shown and (shown)= inside a fenced example | nothing is selected |
| a fence closed by a longer run of the same marker, then a heading resolved | the heading after the fence is selected |

### Scenario (refusal): Nothing matches

| Input | Outcome |
| --- | --- |
| #L400 on a 12-line file | nothing is selected and the file opens at its start |
| #L7-L3, a range that ends before it starts | nothing is selected (start <= end <= line count is required) |
| #^other with no line ending ^other | nothing is selected |

### Scenario (nominal): Frontmatter marker with an exact identity

- GIVEN the lines # @implements_req SwRS-1-extra and # @implements_req SwRS-1
- WHEN the marker @implements_req with identity SwRS-1 is resolved
- THEN line 2 is selected, because a longer identity with the same prefix does not match

### Scenario (refusal): Unknown identity or empty marker

- GIVEN an unknown identity or an empty marker
- WHEN it is resolved
- THEN nothing is selected

### Related requirements

- SwRS-MDOKFSTUDIO-FMSCHEMA-067: the marker annotations of a linked file
- SwRS-MDOKFSTUDIO-FMSCHEMA-073: a resolving frontmatter link opens its target

### Verification notes

- Method: test/core/navigation/previewNavigation.test.ts (line range, block id, heading, fences and the refusal rows: Markdown fragments select headings and source lines, not fenced examples; label and the label in a fence: a MyST (label)= line is the target of its fragment, but not inside a fence; frontmatter marker: marker navigation selects exact marker identities; the HTML id and CRLF rows are untested)
- Method: test/session/links.test.ts (frontmatter marker: a frontmatter link finds its marker with the identity of the text it was analysed from)
- Criteria: start <= end <= line count; fence open and close follow the marker character and length; the first matching line of the file wins.
