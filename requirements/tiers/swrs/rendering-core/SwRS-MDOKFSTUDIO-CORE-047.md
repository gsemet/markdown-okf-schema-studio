---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-047
uuid: fcc7bbf2-04ac-4bd3-b885-ca1c17341fe3
title: Show a citation as an unresolved placeholder
description: When a document holds a `{cite}` role, the extension SHALL render
  an unresolved citation placeholder and SHALL NOT append a bibliography.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-003
- StRS-MDOKFSTUDIO-MYST-005
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Show a citation as an unresolved placeholder

### Normative behavior

When a document holds a `{cite}` role, the extension SHALL render an unresolved citation placeholder and SHALL NOT append a bibliography.

### Scenario: Nominal show a citation as an unresolved placeholder

- GIVEN a `{cite}` to a key
- WHEN it is rendered
- THEN an inert citation placeholder shows

### Scenario: Boundary or refusal of show a citation as an unresolved placeholder

- GIVEN a document without a `{bibliography}`
- WHEN it is rendered
- THEN no bibliography is appended

### Verification notes

- Method: test
- Criteria: A citation yields a placeholder and no added section.
