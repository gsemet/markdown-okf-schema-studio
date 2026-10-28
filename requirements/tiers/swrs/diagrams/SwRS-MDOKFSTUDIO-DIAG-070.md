---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-070
uuid: 80f46ec8-6d9e-4b34-9617-9614c33ee935
title: An unreadable diagram file shows its refusal
description: When the file named by a {uml} or body-less {plantuml} directive is
  outside the allowed folders, is an absolute path or a URL, or is larger than 5
  MiB, the extension SHALL show the refusal message in place of the diagram and
  report one warning for the line.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-068; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-068
default_owner_email: gaetan@xeberon.net
---

## An unreadable diagram file shows its refusal

### Normative behavior

When the file named by a {uml} or body-less {plantuml} directive is outside the allowed folders, is an absolute path or a URL, or is larger than 5 MiB, the extension SHALL show the refusal message in place of the diagram and report one warning for the line.

### Scenario: Outside the folders

- GIVEN a {uml} directive naming a path outside the workspace
- WHEN the preview is rendered
- THEN a message says the file is outside the folders the preview reads, no diagram is produced and one warning is reported for the line

### Scenario: Absolute path

- GIVEN a {uml} directive naming an absolute path
- WHEN the preview is rendered
- THEN the message says the path must be a relative path to a local file

### Known issues

- Known issue: The too-large message is written in code but no test triggers it.

### Verification notes

- Method: Unit test: a diagram file outside the bounds is refused like an include.
- Criteria: Message, warning and no diagram figure.
