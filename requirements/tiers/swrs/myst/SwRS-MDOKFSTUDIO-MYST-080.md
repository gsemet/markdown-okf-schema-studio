---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-080
uuid: 875f181c-2062-466a-bb32-83555a27c0b2
title: conf.py changes update the previews they govern
description: When a conf.py is created, edited or deleted, the extension SHALL
  re-render exactly the open previews it governs without reopening them,
  deferred while a block edit is open.
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

## conf.py changes update the previews they govern

### Normative behavior

When a conf.py is created, edited or deleted, the extension SHALL re-render exactly the open previews it governs without reopening them, deferred while a block edit is open.

### Scenario: Nominal

- GIVEN a conf.py edit
- WHEN the watcher fires
- THEN the governed previews re-render and warnings come or go

### Scenario: Boundary or refusal

- GIVEN a conf.py governing nothing, or an ignored path such as node_modules
- WHEN the watcher fires
- THEN nothing re-renders

### Verification notes

- Method: test
- Criteria: Event order before or after the open does not matter.
