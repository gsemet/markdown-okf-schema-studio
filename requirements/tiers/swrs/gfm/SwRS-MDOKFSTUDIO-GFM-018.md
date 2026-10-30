---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-018
uuid: a047ca63-6d02-4c34-ae95-841a018a097b
title: Checkbox markers stay literal where they have another meaning
description: When [ ] or [x] occurs in code, math, diagrams, link text or URLs,
  images, ATX headings, raw HTML, directive arguments, an escape, wikilink or
  reference syntax, the extension SHALL keep it as literal text, except that [ ]
  still renders as a checkbox when [x] is a defined reference label.
project: markdown-okf-schema-studio
scope: gfm
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-016; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-GFM-016
default_owner_email: gaetan@xeberon.net
---

## Checkbox markers stay literal where they have another meaning

### Normative behavior

When [ ] or [x] occurs in code, math, diagrams, link text or URLs, images, ATX headings, raw HTML, directive arguments, an escape, wikilink or reference syntax, the extension SHALL keep it as literal text, except that [ ] still renders as a checkbox when [x] is a defined reference label.

### Scenario: Literal in code and links

- GIVEN '`[ ]`', '\[ ]', '[x](url)' and '## [ ] h'
- WHEN the preview is rendered
- THEN none produces a checkbox

### Scenario: Defined reference label

- GIVEN a document defining '[x]: url' and using '[x]' and '[ ]'
- WHEN the preview is rendered
- THEN [x] stays a link and [ ] is a checkbox

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Checkbox elements appear only in the allowed contexts.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-GFM-003](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-003.md): A writer toggles task checkboxes from the preview
- Superseded by:
  - [SwRS-MDOKFSTUDIO-GFM-016](SwRS-MDOKFSTUDIO-GFM-016.md): Task list markers render as checkboxes with their source position
<!-- okf:links:end -->
