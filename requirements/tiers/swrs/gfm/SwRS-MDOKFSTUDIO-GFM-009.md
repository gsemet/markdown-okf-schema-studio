---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-009
uuid: 5e63ff09-6841-4031-8ddb-cda015f5369b
title: GitHub alerts render as admonitions
description: When a block quote starts with [!NOTE], [!TIP], [!IMPORTANT],
  [!WARNING] or [!CAUTION] in any case, the extension SHALL render it as an
  admonition of that type with the default title and the quoted lines as
  Markdown body.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## GitHub alerts render as admonitions

### Normative behavior

When a block quote starts with [!NOTE], [!TIP], [!IMPORTANT], [!WARNING] or [!CAUTION] in any case, the extension SHALL render it as an admonition of that type with the default title and the quoted lines as Markdown body.

### Scenario: Each alert type renders

- GIVEN a block quote starting with > [!warning] and a body line
- WHEN the preview is rendered
- THEN an admonition titled Warning contains the body as Markdown

### Scenario: Unknown alert type

- GIVEN a block quote starting with > [!FOO]
- WHEN the preview is rendered
- THEN it stays a plain block quote

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: One admonition per known type, none for unknown types.
