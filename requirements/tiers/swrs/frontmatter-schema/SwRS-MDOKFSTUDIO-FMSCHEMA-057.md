---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-057
uuid: 7397c13a-8c36-4af1-94bf-52d5d3c7d97f
title: An unreadable stem candidate gives a warning
description: When a filename-stem candidate cannot be read, the extension SHALL
  report the warning W15 "could not be resolved because the workspace may be
  unavailable".
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-055; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-055
default_owner_email: gaetan@xeberon.net
---

## An unreadable stem candidate gives a warning

### Normative behavior

When a filename-stem candidate cannot be read, the extension SHALL report the warning W15 "could not be resolved because the workspace may be unavailable".

### Scenario: Broken symbolic link

- GIVEN a symbolic link ghost.md that points to a missing file and the value ghost
- WHEN the document is analysed
- THEN the field carries [W15] Skipped file-link check at 'ref': filename stem 'ghost' could not be resolved because the workspace may be unavailable and the label reads Link unavailable

### Scenario: Readable candidate

- GIVEN the link target is created
- WHEN the document is analysed again
- THEN the link is valid

### Verification notes

- Method: Probed against the resolver; the stem-index unit tests cover the unavailable flag.
- Criteria: An unreadable candidate is neither a match nor a not-found.
