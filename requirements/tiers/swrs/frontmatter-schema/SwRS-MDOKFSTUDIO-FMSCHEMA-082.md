---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-082
uuid: 5288483d-1294-4445-ae7c-266ef634354c
title: A refused frontmatter link shows a warning with its reason
description: 'When a frontmatter link is refused, the extension SHALL show the warning
  "Markdown OKF-Schema Studio could not follow the link: {reason}" with the problem
  message as the reason.'
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

## A refused frontmatter link shows a warning with its reason

### Normative behavior

When a frontmatter link is refused, the extension SHALL show the warning "Markdown OKF-Schema Studio could not follow the link: {reason}" with the problem message as the reason.

### Scenario: Broken link

- GIVEN a link whose target does not exist, activated through its navigation request
- WHEN the request is handled
- THEN VS Code shows the warning with the E10 message as the reason

### Scenario: No message

- GIVEN a link result without a message
- WHEN the request is handled
- THEN the reason reads The frontmatter link is unavailable.

### Verification notes

- Method: Integration test.
- Criteria: The warning is shown once per activation.
