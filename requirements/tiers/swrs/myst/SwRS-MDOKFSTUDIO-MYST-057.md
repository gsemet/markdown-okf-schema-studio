---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-057
uuid: 8c928aff-674c-40e5-8dae-bc3955eb162e
title: Toctree entries render as preview links
description: When a document holds a `{toctree}`, the extension SHALL list its
  documents as links that open in the preview, labelled by the given title, else
  the first level-1 heading, else the file name.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-012
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Toctree entries render as preview links

### Normative behavior

When a document holds a `{toctree}`, the extension SHALL list its documents as links that open in the preview, labelled by the given title, else the first level-1 heading, else the file name.

### Scenario: Nominal

- GIVEN entries a Title followed by the target in angle brackets and a bare target
- WHEN the preview renders
- THEN the first uses Title and the second the target's first heading, skipping frontmatter and code fences

### Scenario: Boundary or refusal

- GIVEN a web address entry or a target with .myst, .markdown or exact name
- WHEN the preview renders
- THEN the web address is an external link and targets are found by those extensions

### Verification notes

- Method: test
- Criteria: Reads follow the resource policy; standalone reads its own folder.
