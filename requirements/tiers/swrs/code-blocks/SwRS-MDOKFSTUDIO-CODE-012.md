---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-012
uuid: a3539cab-429c-428a-bb5c-eb2a2802caf7
title: Style fenced code blocks with one font scale and the code background
description: When a fenced code block is shown, the extension SHALL use the
  editor foreground colour, a font size of 0.92em, a 4 px radius, a border and
  the code-block background, with no box of its own on the inner code.
project: markdown-okf-schema-studio
scope: code-blocks
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CODE-007; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CODE-007
default_owner_email: gaetan@xeberon.net
---

## Style fenced code blocks with one font scale and the code background

### Normative behavior

When a fenced code block is shown, the extension SHALL use the editor foreground colour, a font size of 0.92em, a 4 px radius, a border and the code-block background, with no box of its own on the inner code.

### Scenario: nominal behavior

- GIVEN any fenced block in the preview
- WHEN the page renders
- THEN the block has the code-block background, border and radius and the inner code has no own box

### Scenario: boundary or refusal behavior

- GIVEN a block nested in a list or admonition
- WHEN the page renders
- THEN it uses the same style as a top-level block

### Verification notes

- Method: Stylesheet unit test and computed-style visual check.
- Criteria: Computed values equal the stated style on top-level and nested blocks.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-001](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-001.md): A reader reads highlighted, numbered and diff code
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CODE-007](SwRS-MDOKFSTUDIO-CODE-007.md): Code blocks use one font scale, the theme colours and scroll long lines
<!-- okf:links:end -->
