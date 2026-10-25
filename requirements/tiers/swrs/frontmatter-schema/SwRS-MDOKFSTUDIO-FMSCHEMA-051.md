---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-051
uuid: f71a59f6-a26a-4acd-a54c-7dbb10f8ad3c
title: Bundle-relative links resolve from the bundle root
description: When a link annotation has the resolution `bundle-relative` or
  `bundle-relative-stem`, the extension SHALL resolve the target from the bundle
  root, adding `.md` to the target for the stem form.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-050; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-050
---

## Bundle-relative links resolve from the bundle root

### Normative behavior

When a link annotation has the resolution `bundle-relative` or `bundle-relative-stem`, the extension SHALL resolve the target from the bundle root, adding `.md` to the target for the stem form.

### Scenario: Both forms

- GIVEN a bundle root holding docs/t.md and the values docs/t.md (bundle-relative) and docs/t (bundle-relative-stem)
- WHEN the document is analysed
- THEN both links are valid

### Scenario: No bundle root

- GIVEN no configured bundle root and no index.md or log.md in the parent of the schema folder
- WHEN the document is analysed
- THEN the field carries the warning [W15] Skipped file-link check at 'ref': bundle-relative root is unavailable

### Verification notes

- Method: Unit test of the link resolver.
- Criteria: The label for the unavailable root is Link root unavailable.
