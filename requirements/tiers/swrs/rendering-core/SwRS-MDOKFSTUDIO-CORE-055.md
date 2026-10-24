---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-055
uuid: 5c90fdcd-3e62-4ca2-91da-a9658cff10aa
title: Bound the toctree glob scan
description: When a toctree glob scan runs, the extension SHALL read at most 200
  matches, 400 folders and 8 levels and SHALL skip `node_modules`, `.git`,
  `_build` and `out`.
project: markdown-okf-schema-studio
scope: rendering-core
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

## Bound the toctree glob scan

### Normative behavior

When a toctree glob scan runs, the extension SHALL read at most 200 matches, 400 folders and 8 levels and SHALL skip `node_modules`, `.git`, `_build` and `out`.

### Scenario: Nominal bound the toctree glob scan

- GIVEN a folder holding 250 matches
- WHEN the glob is rendered
- THEN 200 are listed

### Scenario: Boundary or refusal of bound the toctree glob scan

- GIVEN a match inside `node_modules`
- WHEN the glob is rendered
- THEN it is not listed

### Verification notes

- Method: test
- Criteria: Limits and skipped folders hold.
