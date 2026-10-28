---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-027
uuid: 5670b5b4-6fa8-4947-a56d-7467b37b1a5c
title: The host refuses a rename to a name already used
description: When the host receives a rename to a name that another field
  already has, the extension SHALL refuse it with 'A frontmatter field named
  "{name}" already exists.'
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-024; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-024
default_owner_email: gaetan@xeberon.net
---

## The host refuses a rename to a name already used

### Normative behavior

When the host receives a rename to a name that another field already has, the extension SHALL refuse it with 'A frontmatter field named "{name}" already exists.'

### Scenario: Nominal

- GIVEN a document with the fields title and count
- WHEN a rename of title to count arrives
- THEN the answer is 'A frontmatter field named "count" already exists.' and the document is unchanged

### Scenario: Boundary or refusal

- GIVEN a rename to a name with surrounding spaces or an empty name sent directly to the host
- WHEN the host plans the save
- THEN the answer is "Enter a non-empty frontmatter key without leading or trailing spaces."

### Verification notes

- Method: Unit test on the save plan (test/core/edits/frontmatterEdit.test.ts).
- Criteria: The page-side check is a separate requirement; this is the host check.
