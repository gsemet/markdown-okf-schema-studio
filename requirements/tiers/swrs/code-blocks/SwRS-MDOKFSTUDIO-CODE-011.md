---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-011
uuid: a35a379c-e359-4ba3-a712-1df5b8637287
title: Number and emphasize lines of MyST code directives
description: When a MyST `{code}`, `{code-block}` or `{code-cell}` sets a
  numbering option or `:emphasize-lines:`, the extension SHALL number the lines
  from the start value and highlight the listed lines relative to it.
project: markdown-okf-schema-studio
scope: code-blocks
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CODE-005; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CODE-005
default_owner_email: gaetan@xeberon.net
---

## Number and emphasize lines of MyST code directives

### Normative behavior

When a MyST `{code}`, `{code-block}` or `{code-cell}` sets a numbering option or `:emphasize-lines:`, the extension SHALL number the lines from the start value and highlight the listed lines relative to it.

### Scenario: nominal behavior

- GIVEN a `{code-block}` with `:linenos:`, `:lineno-start: 10` and `:emphasize-lines: 2`
- WHEN the preview renders it
- THEN lines are numbered from 10 and the second line is emphasized

### Scenario: boundary or refusal behavior

- GIVEN a directive with `:lineno-start: abc` and `:emphasize-lines: 2,x`
- WHEN the preview renders it
- THEN numbering starts at 1 and the invalid emphasis entry is ignored

### Verification notes

- Method: Unit tests on MyST code directives.
- Criteria: Line numbers and emphasized lines match the options; invalid values fall back.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-001](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-001.md): A reader reads highlighted, numbered and diff code
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CODE-005](SwRS-MDOKFSTUDIO-CODE-005.md): Numbered, emphasized and diff blocks are wrapped into lines
<!-- okf:links:end -->
