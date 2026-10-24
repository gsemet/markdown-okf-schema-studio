---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-025
uuid: 8b221f5d-5966-4f13-bade-745410c4c040
title: Keep the previous page when a render fails
description: When a render fails with an exception, the extension SHALL keep the
  failure message and mark the previous page as stale, or show an error page
  when no previous page exists.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-005
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Keep the previous page when a render fails

### Normative behavior

When a render fails with an exception, the extension SHALL keep the failure message and mark the previous page as stale, or show an error page when no previous page exists.

### Scenario: Nominal keep the previous page when a render fails

- GIVEN a page rendered earlier and a later render that throws
- WHEN the failure occurs
- THEN the old page stays marked stale and the message is kept

### Scenario: Boundary or refusal of keep the previous page when a render fails

- GIVEN a first render that throws
- WHEN the failure occurs
- THEN an error page shows the message

### Verification notes

- Method: test
- Criteria: A failed render never blanks a good page; with none it shows an error page.
