---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-010
uuid: cfb3d4f8-353b-4e0f-93ef-f5725aaa5f6e
title: The Mermaid drawing cache keeps 64 drawings
description: When more than 64 distinct Mermaid drawings have been stored, the
  page SHALL discard the least recently used drawing.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: true
exemption_reason: "Archived. Not an observable behaviour; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## The Mermaid drawing cache keeps 64 drawings

### Normative behavior

When more than 64 distinct Mermaid drawings have been stored, the page SHALL discard the least recently used drawing.

### Scenario: Sixty-five drawings

- GIVEN 65 distinct diagrams drawn one after the other
- WHEN the 65th drawing is stored
- THEN the cache holds 64 drawings and the first one is gone

### Scenario: Reuse refreshes

- GIVEN a stored drawing that is reused after newer ones were stored
- WHEN another drawing is stored beyond the limit
- THEN a newer unused drawing is discarded first and the reused one stays

### Verification notes

- Method: Unit test of the drawing cache.
- Criteria: Size never exceeds 64 and eviction order is least recently used.
