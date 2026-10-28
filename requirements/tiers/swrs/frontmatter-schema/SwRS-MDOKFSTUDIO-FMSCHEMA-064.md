---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-064
uuid: 68636cbf-e7d1-48de-a16b-e2d95abe85f9
title: A link that does not resolve shows its problem
description: When a frontmatter link does not resolve, the extension SHALL show
  the value text followed by an error or warning mark and a plain label.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-063; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-063
default_owner_email: gaetan@xeberon.net
---

## A link that does not resolve shows its problem

### Normative behavior

When a frontmatter link does not resolve, the extension SHALL show the value text followed by an error or warning mark and a plain label.

### Scenario: Not found

- GIVEN a link value nope.md
- WHEN the table is rendered
- THEN the text nope.md is followed by the mark ✖ and the label File not found

### Scenario: Root unavailable

- GIVEN a bundle-relative link without a bundle root
- WHEN the table is rendered
- THEN the text is followed by the mark ⚠ and the label Link root unavailable

### Verification notes

- Method: Unit test of the table renderer; integration test.
- Criteria: Labels: File not found, Outside the allowed folder, Link root unavailable, Absolute paths are not allowed, Several files match, Empty link; any other E10 reads Invalid link and any other W15 reads Link unavailable.
