---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-017
uuid: 4ecff0ae-9658-444d-aff5-f1cbad8bb236
title: Invalid YAML gives one error row and an error badge
description: 'When the frontmatter block is not valid YAML, the extension SHALL show
  one error row "Invalid frontmatter YAML: {parser message}" and an error badge of
  1.'
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-002
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-001
default_owner_email: gaetan@xeberon.net
---

## Invalid YAML gives one error row and an error badge

### Normative behavior

When the frontmatter block is not valid YAML, the extension SHALL show one error row "Invalid frontmatter YAML: {parser message}" and an error badge of 1.

### Scenario: Broken YAML

- GIVEN a document whose frontmatter is the single line `k: [a` followed by a heading
- WHEN the preview is rendered
- THEN the table holds one alert row starting with "Invalid frontmatter YAML:" and the badge reads 1 error

### Scenario: Schema type present

- GIVEN a broken frontmatter that also names a type with a schema
- WHEN the preview is rendered
- THEN no schema is applied, no field row is listed and the single error row is shown

### Verification notes

- Method: Unit test of the frontmatter extraction (extractFrontmatter reports invalid YAML); the row text and the badge of 1 are asserted by the visual scenario only.
- Criteria: The error row has role alert and spans every column; the summary is 1 error, 0 warnings, 0 infos.
- Known issue: the parser message is the raw text of the YAML library, with line numbers relative to the frontmatter and caret markers.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-002](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-002.md): Invalid frontmatter is explained and the body still renders
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-001](SwRS-MDOKFSTUDIO-FMSCHEMA-001.md): The frontmatter block is found by its fences and parsed as a YAML mapping
<!-- okf:links:end -->
