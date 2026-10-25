---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-079
uuid: 0d880012-7fa4-4a13-a700-4dd896a0f3ef
title: The bundle root defaults to the schema folder's parent
description: When `markdownOkfSchemaStudio.frontmatter.bundleRoot` is empty, the
  extension SHALL use the parent of the schema folder as the bundle root if it
  contains the document and an `index.md` or `log.md`.
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

## The bundle root defaults to the schema folder's parent

### Normative behavior

When `markdownOkfSchemaStudio.frontmatter.bundleRoot` is empty, the extension SHALL use the parent of the schema folder as the bundle root if it contains the document and an `index.md` or `log.md`.

### Scenario: Convention root

- GIVEN bundleRoot empty, a schema folder bundle/_schema, a document in bundle/docs and a file bundle/index.md
- WHEN a bundle-relative link is analysed
- THEN the link resolves from the bundle folder

### Scenario: No marker file

- GIVEN the same layout without index.md and log.md
- WHEN a bundle-relative link is analysed
- THEN the field carries the warning ... bundle-relative root is unavailable

### Verification notes

- Method: Unit test of the root resolution.
- Criteria: Otherwise bundle-relative links show the warning W15 with the label Link root unavailable.
