---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-076
uuid: b5ff19cd-1f6a-4a61-ae93-b0c5ebfcfc17
title: Included files are not checked against conf.py
description: When a document brings in a file with `{include}`, the extension
  SHALL not check the included text against conf.py.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-072; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-072
default_owner_email: gaetan@xeberon.net
---

## Included files are not checked against conf.py

### Normative behavior

When a document brings in a file with `{include}`, the extension SHALL not check the included text against conf.py.

### Scenario: Nominal

- GIVEN an included file using colon fences without colon_fence enabled
- WHEN the including document is checked
- THEN no warning is raised for it

### Scenario: Boundary or refusal

- GIVEN the same syntax in the document's own text
- WHEN the document is checked
- THEN the warning is raised

### Verification notes

- Method: Unit test "an included file is not checked against conf.py while the document's own text is" in test/core/render/renderReq.myst.requirements.test.ts
- Criteria: Only the document's own text is read.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-007](../../strs/myst/StRS-MDOKFSTUDIO-MYST-007.md): Sphinx configuration gaps are reported before building
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-072](SwRS-MDOKFSTUDIO-MYST-072.md): MyST syntax of a disabled extension is reported with its line
<!-- okf:links:end -->
