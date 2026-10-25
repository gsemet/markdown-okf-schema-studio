---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-072
uuid: 7255b40e-ee26-44d5-9fbc-11e9b49aee68
title: The extension contributes no language, grammar or editors entry
description: When VS Code reads the manifest of the package, it SHALL find no
  contribution of a language, a grammar or an editors entry.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-001
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The extension contributes no language, grammar or editors entry

### Normative behavior

When VS Code reads the manifest of the package, it SHALL find no contribution of a language, a grammar or an editors entry.

### Scenario: Contributes

- GIVEN the contributes section of the manifest
- WHEN its keys are listed
- THEN it has no languages, grammars or editors entry

### Scenario: Values

- GIVEN the same section serialized
- WHEN it is searched for markdown. keys
- THEN none appears

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-148: no command whose identifier starts with markdown.
- SwRS-MDOKFSTUDIO-LIFE-018: the custom editor is an optional editor with priority option
- SwRS-MDOKFSTUDIO-TRUST-071: the same manifest

### Verification notes

- Method: Unit test test/security/package-contract.test.ts (contributes only opt-in Markdown OKF-Schema Studio commands).
- Criteria: The built-in Markdown preview, its commands and its settings stay as VS Code ships them.
