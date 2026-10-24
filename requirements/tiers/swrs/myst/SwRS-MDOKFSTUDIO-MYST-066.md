---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-066
uuid: 0276317b-3ce9-44cd-8013-883ca64d5c6f
title: The governing conf.py is the nearest ancestor
description: When a document is checked, the extension SHALL use the nearest
  `conf.py` in its folder or any folder up to the workspace root, never one
  above the root, and for a document outside the workspace only its own folder.
project: markdown-okf-schema-studio
scope: myst
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

## The governing conf.py is the nearest ancestor

### Normative behavior

When a document is checked, the extension SHALL use the nearest `conf.py` in its folder or any folder up to the workspace root, never one above the root, and for a document outside the workspace only its own folder.

### Scenario: Nominal

- GIVEN conf.py in two ancestor folders
- WHEN a document below both is checked
- THEN the nearer one governs

### Scenario: Boundary or refusal

- GIVEN a conf.py above the workspace root, or a document outside the workspace
- WHEN a document is checked
- THEN the root-outside file is not used and the outside document gets no fallback

### Verification notes

- Method: test
- Criteria: Standalone and untrusted previews use the same lookup.
