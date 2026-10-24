---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-089
uuid: 93c03e22-4c27-4563-ac2f-4209b68b14f0
title: The conf.py reader applies list mutations in order
description: When a conf.py changes `extensions` or `myst_enable_extensions`
  with `=`, `+=`, `.append`, `.extend` or list addition, the extension SHALL
  apply the changes in written order.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The conf.py reader applies list mutations in order

### Normative behavior

When a conf.py changes `extensions` or `myst_enable_extensions` with `=`, `+=`, `.append`, `.extend` or list addition, the extension SHALL apply the changes in written order.

### Scenario: Nominal

- GIVEN `extensions = ["a"]` then `.append("b")` and `+= ["c"]`
- WHEN the file is read
- THEN the list is a, b, c in that order

### Scenario: Boundary or refusal

- GIVEN `.extend([...])` followed by a later `=` reassignment
- WHEN the file is read
- THEN the later assignment replaces the earlier result

### Verification notes

- Method: test
- Criteria: Each mutation form is applied in order.
