---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-083
uuid: c2a0b35b-3407-4f76-9c8b-aedfff9a9a9b
title: A malformed frontmatter link request is refused
description: When the navigation request of a frontmatter link is malformed, the
  extension SHALL refuse it with the reason "The frontmatter link request is
  invalid.".
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-018
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A malformed frontmatter link request is refused

### Normative behavior

When the navigation request of a frontmatter link is malformed, the extension SHALL refuse it with the reason "The frontmatter link request is invalid.".

### Scenario: Malformed request

- GIVEN a navigation request okf-link: followed by text that is not valid JSON
- WHEN the request is handled
- THEN the reason reads The frontmatter link request is invalid. and nothing opens

### Scenario: Well-formed request

- GIVEN a request whose JSON names an existing link
- WHEN the request is handled
- THEN the link is followed

### Verification notes

- Method: No test today for the malformed case.
- Criteria: The reason is shown in the same warning as other refusals.
- Known issue: the malformed-request message has no test.
