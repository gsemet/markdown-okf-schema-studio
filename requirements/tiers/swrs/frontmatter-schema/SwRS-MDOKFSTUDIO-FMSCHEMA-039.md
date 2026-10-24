---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-039
uuid: fe2a1096-0c48-4140-95d7-f0464073fac5
title: The title badge counts the issues
description: When the frontmatter has errors or warnings, the extension SHALL
  show in the table title a badge button with the count of errors then the count
  of warnings.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-011
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The title badge counts the issues

### Normative behavior

When the frontmatter has errors or warnings, the extension SHALL show in the table title a badge button with the count of errors then the count of warnings.

### Scenario: Errors and warnings

- GIVEN a document with 1 error and 2 warnings
- WHEN the preview is rendered
- THEN the badge reads ✖ 1 ⚠ 2

### Scenario: No issue

- GIVEN a document without any issue
- WHEN the preview is rendered
- THEN no badge is shown

### Verification notes

- Method: Unit test of the table renderer.
- Criteria: The badge is a button with the label Go to the first frontmatter issue.
