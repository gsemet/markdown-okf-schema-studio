---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-064
uuid: 37838921-382e-4f70-b959-dc32ee3419e9
title: Warn about MyST syntax of a disabled extension
description: When a document uses syntax of an extension that the nearest
  `conf.py` does not enable, the extension SHALL list one `myst-extension`
  warning per extension, at most 10 per render, and leave the rendering
  unchanged.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Warn about MyST syntax of a disabled extension

### Normative behavior

When a document uses syntax of an extension that the nearest `conf.py` does not enable, the extension SHALL list one `myst-extension` warning per extension, at most 10 per render, and leave the rendering unchanged.

### Scenario: Nominal warn about MyST syntax of a disabled extension

- GIVEN syntax of a disabled extension
- WHEN it is rendered
- THEN one warning is listed and the output is unchanged

### Scenario: Boundary or refusal of warn about MyST syntax of a disabled extension

- GIVEN no `conf.py`
- WHEN it is rendered
- THEN no warning is listed

### Verification notes

- Method: test
- Criteria: One warning per extension, capped at 10.
