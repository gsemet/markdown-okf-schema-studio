---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-033
uuid: 34eec273-c9c9-47d7-9718-24a0aa47c489
title: Keep inline code compact in tables
description: When inline code sits in a table cell, the extension SHALL keep it
  compact and SHALL NOT split a short identifier in a sideways-scrolling table.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Keep inline code compact in tables

### Normative behavior

When inline code sits in a table cell, the extension SHALL keep it compact and SHALL NOT split a short identifier in a sideways-scrolling table.

### Scenario: Nominal keep inline code compact in tables

- GIVEN a short identifier in a scrolling table
- WHEN it is shown
- THEN it stays on one line

### Scenario: Boundary or refusal of keep inline code compact in tables

- GIVEN a table cell with inline code
- WHEN it is shown
- THEN the code has compact padding

### Verification notes

- Method: test
- Criteria: Short identifiers are never split in a scrolling table.
