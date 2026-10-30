---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-037
uuid: c1ffdcbf-c10c-45f6-8990-7ebd47e1dc63
title: Fall back to escaped text lines when a grammar fails
description: When a grammar throws while highlighting a numbered, emphasized or
  diff block, the extension SHALL show the block's escaped text in wrapped
  lines.
project: markdown-okf-schema-studio
scope: code-blocks
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CODE-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CODE-001
default_owner_email: gaetan@xeberon.net
---

## Fall back to escaped text lines when a grammar fails

### Normative behavior

When a grammar throws while highlighting a numbered, emphasized or diff block, the extension SHALL show the block's escaped text in wrapped lines.

### Scenario: nominal behavior

- GIVEN a numbered block whose grammar throws while highlighting
- WHEN the preview renders it
- THEN the lines show the escaped source text

### Scenario: boundary or refusal behavior

- GIVEN an unwrapped block whose grammar throws
- WHEN the preview renders it
- THEN the original block is returned unchanged

### Verification notes

- Method: Unit test with a throwing grammar stub.
- Criteria: Output is escaped, wrapped text for wrapped blocks; original block otherwise.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-001](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-001.md): A reader reads highlighted, numbered and diff code
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CODE-001](SwRS-MDOKFSTUDIO-CODE-001.md): Fenced code in a supported language is highlighted, other code stays literal
<!-- okf:links:end -->
