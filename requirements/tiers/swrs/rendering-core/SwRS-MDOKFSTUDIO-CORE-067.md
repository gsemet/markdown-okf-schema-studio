---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-067
uuid: b2ba4342-e1a2-42a7-a5e7-33e4ed8fce4d
title: Refuse oversize included files
description: When an included file is larger than 5 MiB, the extension SHALL
  leave its include directive as an unresolved placeholder.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-002
- StRS-MDOKFSTUDIO-CORE-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Refuse oversize included files

### Normative behavior

When an included file is larger than 5 MiB, the extension SHALL leave its include directive as an unresolved placeholder.

### Scenario: Nominal

- GIVEN an included file of 5 MiB plus one byte
- WHEN it is rendered
- THEN the directive stays a placeholder and the file is not expanded

### Scenario: Boundary or refusal

- GIVEN an included file of exactly 5 MiB
- WHEN it is rendered
- THEN the file is expanded

### Verification notes

- Method: test
- Criteria: The 5 MiB limit is inclusive of the file size; larger files stay placeholders.
