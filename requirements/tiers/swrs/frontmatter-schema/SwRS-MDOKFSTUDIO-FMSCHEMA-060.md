---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-060
uuid: d672058b-a3f5-467f-948e-3e99e4aca0cb
title: The bundleRoot setting sets the bundle root
description: When `markdownOkfSchemaStudio.frontmatter.bundleRoot` is a
  non-empty string, the extension SHALL use that folder as the bundle root, a
  relative path being taken from the first workspace folder.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-015
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The bundleRoot setting sets the bundle root

### Normative behavior

When `markdownOkfSchemaStudio.frontmatter.bundleRoot` is a non-empty string, the extension SHALL use that folder as the bundle root, a relative path being taken from the first workspace folder.

### Scenario: Configured root

- GIVEN bundleRoot set to bundle and a bundle-relative link docs/t.md
- WHEN the document is analysed
- THEN the link resolves from the bundle folder

### Scenario: Root that does not exist

- GIVEN bundleRoot set to a folder that does not exist
- WHEN the document is analysed
- THEN the field carries the warning ... bundle-relative root is unavailable, with no fall back to the convention root

### Verification notes

- Method: Unit test of the settings and of the root resolution.
- Criteria: Default empty string; the value is trimmed; an absolute path is used as it is; any non-folder value is treated as unavailable.
- Known issue: a configured root that does not exist is reported exactly like a missing convention root, without naming the setting.
