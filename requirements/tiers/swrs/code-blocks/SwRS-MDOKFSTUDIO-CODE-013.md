---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-013
uuid: c2b55d26-68ee-4ede-9f74-e293a1184f08
title: Scroll long code lines inside their block
description: When a code line is wider than its block outside Auto width mode,
  the extension SHALL scroll the block horizontally to the line's far end
  without widening the page, also at a 460 px panel width.
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

## Scroll long code lines inside their block

### Normative behavior

When a code line is wider than its block outside Auto width mode, the extension SHALL scroll the block horizontally to the line's far end without widening the page, also at a 460 px panel width.

### Scenario: nominal behavior

- GIVEN a Python block with a very long line in a 460 px panel
- WHEN the reader scrolls the block to the right
- THEN the line's far end becomes visible and the page has no horizontal overflow

### Scenario: boundary or refusal behavior

- GIVEN a block whose longest line is exactly as wide as the block
- WHEN the preview renders it
- THEN the block shows no horizontal scrollbar and the page has no overflow

### Verification notes

- Method: Visual scenario with geometry check.
- Criteria: Block scrollWidth exceeds clientWidth for the long line, equals it for the exact-fit line, and the document never overflows.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-001](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-001.md): A reader reads highlighted, numbered and diff code
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CODE-007](SwRS-MDOKFSTUDIO-CODE-007.md): Code blocks use one font scale, the theme colours and scroll long lines
<!-- okf:links:end -->
