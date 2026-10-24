---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-014
uuid: 51578f59-ca77-4cc8-a5d6-28d8a9ab95a7
title: Keep unsupported include forms as placeholders
description: When an `{include}` has an empty argument, the `:literal:` option
  or an option other than `:class:` and `:label:`, the extension SHALL leave it
  as an unresolved placeholder.
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

## Keep unsupported include forms as placeholders

### Normative behavior

When an `{include}` has an empty argument, the `:literal:` option or an option other than `:class:` and `:label:`, the extension SHALL leave it as an unresolved placeholder.

### Scenario: Nominal keep unsupported include forms as placeholders

- GIVEN an include with `:literal:`
- WHEN it is rendered
- THEN the directive shows as a placeholder, not expanded

### Scenario: Boundary or refusal of keep unsupported include forms as placeholders

- GIVEN an include with only `:class:`
- WHEN it is rendered
- THEN the file is expanded

### Verification notes

- Method: test
- Criteria: Only plain, `:class:` and `:label:` includes expand.
