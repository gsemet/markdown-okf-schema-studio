---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-016
uuid: d988f095-ed02-414a-897d-50e5094ccc16
title: The host refuses invalid or empty YAML values
description: 'When the host receives a YAML field value that does not parse or is
  empty, the extension SHALL refuse the save with "Invalid YAML value: {parser message}".'
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The host refuses invalid or empty YAML values

### Normative behavior

When the host receives a YAML field value that does not parse or is empty, the extension SHALL refuse the save with "Invalid YAML value: {parser message}".

### Scenario: Nominal

- GIVEN a save with fieldValueFormat yaml and the text [
- WHEN the host plans the save
- THEN the answer is the error "Invalid YAML value: " followed by the parser message and the document is unchanged

### Scenario: Boundary or refusal

- GIVEN a save with fieldValueFormat yaml and an empty or blank text
- WHEN the host plans the save
- THEN the error is "Invalid YAML value: Enter a YAML value."; a non-text payload gets "The YAML field value must be text."

### Verification notes

- Method: Unit test on the save plan (test/core/edits/frontmatterEdit.test.ts).
- Criteria: A flush skips the parse refusal and keeps the typed text, see the flush requirements.
