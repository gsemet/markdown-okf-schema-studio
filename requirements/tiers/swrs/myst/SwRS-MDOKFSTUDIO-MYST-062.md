---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-062
uuid: e5e288ea-6336-44fa-9b89-0bff300734ca
title: Missing toctree documents show as warned text
description: "When a toctree entry's document cannot be found, the extension SHALL
  show its text without a link in a warning style with the tooltip Document not found:
  name and add no warning to the status region or Problems view."
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

## Missing toctree documents show as warned text

### Normative behavior

When a toctree entry's document cannot be found, the extension SHALL show its text without a link in a warning style with the tooltip Document not found: name and add no warning to the status region or Problems view.

### Scenario: Nominal

- GIVEN an entry naming a missing file
- WHEN the preview renders
- THEN text shows unlinked with the tooltip

### Scenario: Boundary or refusal

- GIVEN no document reader available
- WHEN the preview renders
- THEN every entry shows as missing; no diagnostic is raised

### Verification notes

- Method: test
- Criteria: No diagnostic either way.
