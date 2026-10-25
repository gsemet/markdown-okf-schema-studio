---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-068
uuid: 72f02405-c78c-4ce6-bd67-9054558384d2
title: conf.py is read as text and the check needs a MyST parser
description: When the extension reads a conf.py, the extension SHALL never run
  it and check only when `extensions` contains myst_parser or myst_nb, reporting
  nothing when no conf, no parser or an uncertain list.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-066; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-066
---

## conf.py is read as text and the check needs a MyST parser

### Normative behavior

When the extension reads a conf.py, the extension SHALL never run it and check only when `extensions` contains myst_parser or myst_nb, reporting nothing when no conf, no parser or an uncertain list.

### Scenario: Nominal

- GIVEN a conf.py listing myst_parser
- WHEN a document is checked
- THEN missing extensions are reported

### Scenario: Boundary or refusal

- GIVEN no conf.py, no MyST parser, an uncertain list or an I/O error
- WHEN a document is checked
- THEN nothing is reported and rendering is unchanged

### Verification notes

- Method: Unit test "no conf.py, no myst_parser or an uncertain conf.py give no set" in test/core/myst/confLocator.test.ts
- Criteria: The file is never executed.
