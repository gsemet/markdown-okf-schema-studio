---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-015
uuid: 9dc24100-f69d-4c56-b224-6fe3a590468d
title: Render a captioned code directive as a figure with a reference target
description: When a MyST code directive sets `:caption:` and `:label:`, the
  extension SHALL render a figure with the caption whose id is the label, usable
  as a `{ref}` target.
project: markdown-okf-schema-studio
scope: code-blocks
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CODE-014; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CODE-014
default_owner_email: gaetan@xeberon.net
---

## Render a captioned code directive as a figure with a reference target

### Normative behavior

When a MyST code directive sets `:caption:` and `:label:`, the extension SHALL render a figure with the caption whose id is the label, usable as a `{ref}` target.

### Scenario: nominal behavior

- GIVEN a `{code-block}` with `:caption: Demo` and `:label: code:numbered`
- WHEN the preview renders it
- THEN a figure with id `code:numbered` shows the caption `Demo`

### Scenario: boundary or refusal behavior

- GIVEN a code directive with a caption but no label
- WHEN the preview renders it
- THEN a captioned figure appears without a reference id

### Verification notes

- Method: Unit test on MyST rendering.
- Criteria: Figure id equals the label; caption text present.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-001](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-001.md): A reader reads highlighted, numbered and diff code
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CODE-014](SwRS-MDOKFSTUDIO-CODE-014.md): A code directive shows its file name or caption above the code
<!-- okf:links:end -->
