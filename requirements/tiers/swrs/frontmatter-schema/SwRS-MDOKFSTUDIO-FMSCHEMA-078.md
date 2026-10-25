---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-078
uuid: 75334952-4740-49ed-a998-13a287593169
title: At most 64 resolved schemas are kept
description: When more than 64 schemas have been resolved, the extension SHALL
  drop the oldest resolved schema and release its compiled validator.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-006
annotation_exemption: true
exemption_reason: "Archived. Not an observable behaviour; no marker expected."
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

- Method: Unit test `the registry keeps 64 resolved schemas and drops the oldest at the 65th` in `test/core/frontmatter/diagReq.frontmatter.requirements.test.ts`.
- Criteria: MAX_ENTRIES is 64; the oldest entry in insertion order is dropped.
