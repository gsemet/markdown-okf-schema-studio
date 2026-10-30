---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-031
uuid: 214e4229-491f-42b8-98d8-b68879467061
title: Style inline code as a pill
description: When the preview shows inline code, the extension SHALL draw a tint
  and hairline derived from the text colour with a 4 px radius at 0.875em,
  padded on every wrapped line without growing the line height, scaled inside
  headings.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-028; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-028
default_owner_email: gaetan@xeberon.net
---

## Style inline code as a pill

### Normative behavior

When the preview shows inline code, the extension SHALL draw a tint and hairline derived from the text colour with a 4 px radius at 0.875em, padded on every wrapped line without growing the line height, scaled inside headings.

### Scenario: Nominal style inline code as a pill

- GIVEN inline code in a paragraph
- WHEN it is shown
- THEN it has the tint, hairline and radius

### Scenario: Boundary or refusal of style inline code as a pill

- GIVEN inline code that wraps over two lines
- WHEN it is shown
- THEN each line is padded and the line height is unchanged

### Verification notes

- Method: Unit test "inline code is a subtle tinted pill derived from the text colour" in test/core/preview/inlineCode.test.ts
- Criteria: Computed styles and line height match.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-028](SwRS-MDOKFSTUDIO-CORE-028.md): Body text, headings, lists and inline code are typeset readably
<!-- okf:links:end -->
