---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-030
uuid: 01883f36-5726-49dc-8b9f-55f73eafbaed
title: Prices are not reported as missing dollarmath
description: When a document holds dollar amounts such as `$19 base ... ($200)`,
  `$5 and $6` or `$100-$380`, the extension SHALL not report a missing
  dollarmath extension for them.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
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

## Prices are not reported as missing dollarmath

### Normative behavior

When a document holds dollar amounts such as `$19 base ... ($200)`, `$5 and $6` or `$100-$380`, the extension SHALL not report a missing dollarmath extension for them.

### Scenario: Nominal

- GIVEN a price text and a conf.py without dollarmath
- WHEN the preview renders
- THEN no myst-extension warning is raised

### Scenario: Boundary or refusal

- GIVEN a real `$x$` span (opening `$` not followed by a space, closing `$` not after a space or before a digit)
- WHEN the preview renders
- THEN dollarmath is reported as missing

### Verification notes

- Method: Unit test "prices and ordinary braces are not math or substitutions" in test/core/render/mystSyntaxDetect.test.ts
- Criteria: Only real spans count; render divergence of currency is an open question.
