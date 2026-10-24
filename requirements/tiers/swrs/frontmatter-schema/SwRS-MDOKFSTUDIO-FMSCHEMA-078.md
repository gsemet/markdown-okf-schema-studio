---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-078
uuid: 75334952-4740-49ed-a998-13a287593169
title: At most 64 resolved schemas are kept
description: When more than 64 schemas have been resolved, the extension SHALL
  drop the oldest resolved schema and release its compiled validator.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-009
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## At most 64 resolved schemas are kept

### Normative behavior

When more than 64 schemas have been resolved, the extension SHALL drop the oldest resolved schema and release its compiled validator.

### Scenario: 65th schema

- GIVEN 65 different schema files resolved one after the other
- WHEN the 65th is resolved
- THEN the first one is no longer cached and is read again at its next analysis

### Scenario: Within the limit

- GIVEN 64 schemas resolved
- WHEN one of them is analysed again
- THEN it is served from the cache

### Verification notes

- Method: No test today (the schema registry unit tests never reach the 64-entry cap).
- Criteria: MAX_ENTRIES is 64; the oldest entry in insertion order is dropped.
- Known issue: the 64-entry cap has no test.
