---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-032
uuid: 89114af5-eb78-4a39-91ba-6a216f92d72e
title: Raw table styles keep a sanitized subset
description: When a raw HTML table element has a style, the extension SHALL keep
  only text and background colours, text-fill, background-clip text and linear
  gradients, removing other declarations with a diagnostic.
project: markdown-okf-schema-studio
scope: gfm
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-031; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-GFM-031
default_owner_email: gaetan@xeberon.net
---

## Raw table styles keep a sanitized subset

### Normative behavior

When a raw HTML table element has a style, the extension SHALL keep only text and background colours, text-fill, background-clip text and linear gradients, removing other declarations with a diagnostic.

### Scenario: Safe colours kept

- GIVEN a cell style 'color: red; background-color: #fff'
- WHEN the preview is rendered
- THEN both declarations are kept

### Scenario: Unsafe style removed

- GIVEN a cell style 'position: fixed; background: url(x)'
- WHEN the preview is rendered
- THEN declarations are removed and a diagnostic is recorded

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Only whitelisted declarations remain.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-GFM-002](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-002.md): GitHub Flavored Markdown renders as on GitHub, safely
- Superseded by:
  - [SwRS-MDOKFSTUDIO-GFM-031](SwRS-MDOKFSTUDIO-GFM-031.md): Raw HTML tables are rebuilt from an allow-list
<!-- okf:links:end -->
