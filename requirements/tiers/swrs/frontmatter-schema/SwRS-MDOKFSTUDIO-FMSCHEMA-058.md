---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-058
uuid: 5458f4f7-fc9a-4ad1-954d-037473ecabcd
title: The stem index skips build and hidden folders
description: When the Markdown stem index is built, the extension SHALL skip the
  folders node_modules, .git, _build, .venv, out, dist and output and every
  folder whose name starts with a dot.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-055; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-055
default_owner_email: gaetan@xeberon.net
---

## The stem index skips build and hidden folders

### Normative behavior

When the Markdown stem index is built, the extension SHALL skip the folders node_modules, .git, _build, .venv, out, dist and output and every folder whose name starts with a dot.

### Scenario: Excluded folders

- GIVEN files named like stems inside node_modules, dist, out, output, _build, .venv, .git and a hidden folder
- WHEN the stems are looked up
- THEN none of them is found

### Scenario: Ordinary folder

- GIVEN a file in an ordinary folder
- WHEN its stem is looked up
- THEN it is found

### Scenario: Case of the stem

- GIVEN a file Same.md and the link value same
- WHEN the stem is looked up
- THEN the stem is not found

### Verification notes

- Method: Unit test of the stem index for the excluded folders and the ordinary folder; the "Case of the stem" scenario has no test.
- Criteria: The exclusion applies at every depth. Stems are compared case-sensitively (Same.md does not satisfy the stem same), only files whose name ends in lowercase `.md` are indexed, and symbolic links to folders are not entered.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-014](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-014.md): Frontmatter link fields resolve, show their status and can be followed
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-055](SwRS-MDOKFSTUDIO-FMSCHEMA-055.md): A filename stem resolves when exactly one file matches
<!-- okf:links:end -->
