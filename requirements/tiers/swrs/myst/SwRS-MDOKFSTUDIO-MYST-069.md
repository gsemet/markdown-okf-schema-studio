---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-069
uuid: b13a0e56-2231-412c-abda-a5736ab693a2
title: The conf.py reader understands list literal forms
description: When a conf.py writes `extensions` or `myst_enable_extensions` as
  list or tuple literals, the extension SHALL read their elements whatever the
  quoting, prefix, comment, continuation or line ending.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-066; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-066
default_owner_email: gaetan@xeberon.net
---

## The conf.py reader understands list literal forms

### Normative behavior

When a conf.py writes `extensions` or `myst_enable_extensions` as list or tuple literals, the extension SHALL read their elements whatever the quoting, prefix, comment, continuation or line ending.

### Scenario: Nominal

- GIVEN lists with single, double and triple quotes, comments, trailing commas, implicit string joins and backslash or bracket continuations
- WHEN the file is read
- THEN the element list is complete and correct

### Scenario: Boundary or refusal

- GIVEN CRLF line endings and r or u string prefixes
- WHEN the file is read
- THEN the same elements result

### Verification notes

- Method: Unit test "comments, tuples, single quotes, trailing commas and string joins are understood" in test/core/myst/confParser.test.ts
- Criteria: Literal forms are parsed; CRLF and prefixes have no dedicated assertion today.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-007](../../strs/myst/StRS-MDOKFSTUDIO-MYST-007.md): Sphinx configuration gaps are reported before building
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-066](SwRS-MDOKFSTUDIO-MYST-066.md): The governing conf.py is found and read as text
<!-- okf:links:end -->
