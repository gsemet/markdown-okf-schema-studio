---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-073
uuid: 8bb14df6-4f35-4797-ad89-08692e370c2f
title: A {uml} directive without file or body says so
description: When a {uml} directive has neither a file path nor a body, the
  extension SHALL show The {uml} directive needs a diagram file path or a
  diagram body. in place of the diagram and report a warning.
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
superseded_by: SwRS-MDOKFSTUDIO-DIAG-068
default_owner_email: gaetan@xeberon.net
---

## A {uml} directive without file or body says so

### Normative behavior

When a {uml} directive has neither a file path nor a body, the extension SHALL show The {uml} directive needs a diagram file path or a diagram body. in place of the diagram and report a warning.

### Scenario: Empty uml

- GIVEN a {uml} directive with no argument and no body
- WHEN the preview is rendered
- THEN the message appears and a warning is reported

### Scenario: Empty plantuml

- GIVEN a {plantuml} directive with no argument and no body
- WHEN the preview is rendered
- THEN no such message appears; the diagram is an empty figure

### Verification notes

- Method: Unit test: a {uml} directive with neither a file nor a body says so.
- Criteria: Only {uml} gets the message.
