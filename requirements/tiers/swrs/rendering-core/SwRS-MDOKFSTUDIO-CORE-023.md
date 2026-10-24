---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-023
uuid: 80b36715-c340-4a3b-b9bb-dc88334b957e
title: List a warning for an unavailable directive
description: When a directive is replaced by a placeholder, the extension SHALL
  list "Directive {name} is not available outside a full build." with its line
  in the status region while the render stays successful.
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

## List a warning for an unavailable directive

### Normative behavior

When a directive is replaced by a placeholder, the extension SHALL list "Directive {name} is not available outside a full build." with its line in the status region while the render stays successful.

### Scenario: Nominal list a warning for an unavailable directive

- GIVEN an unknown directive on line 4
- WHEN it is rendered
- THEN the status region lists the warning with line 4 and the status is "Preview ready"

### Scenario: Boundary or refusal of list a warning for an unavailable directive

- GIVEN a document with no unresolved directive
- WHEN it is rendered
- THEN no such warning is listed

### Verification notes

- Method: test
- Criteria: One warning per placeholder with its line, and a ready status.
