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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-003
- StRS-MDOKFSTUDIO-MYST-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-022; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CORE-022
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

- Method: Unit test "project-scoped roles and directives degrade to labelled placeholders" in test/core/render/mystFeatures.test.ts; Integration suite run() in test/integration/projectFeatures.test.ts
- Criteria: One warning per placeholder with its line, and a ready status.
