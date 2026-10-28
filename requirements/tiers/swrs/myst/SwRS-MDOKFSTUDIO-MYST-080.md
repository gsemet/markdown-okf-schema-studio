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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-078; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-078
default_owner_email: gaetan@xeberon.net
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

- Method: Integration suite run() in test/integration/mystDiagnostics.test.ts
- Criteria: Event order before or after the open does not matter.
