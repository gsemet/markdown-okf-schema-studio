---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-027
uuid: 7c77a3f1-e1ea-4e2a-8c8b-029e61ea689b
title: Warm the render engine at activation
description: When the extension activates, the extension SHALL load the MyST
  engine once so that the first render does not pay the module load cost,
  swallowing a failure of that load without showing an error.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Archived. Not an observable behaviour; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Warm the render engine at activation

### Normative behavior

When the extension activates, the extension SHALL load the MyST engine once so that the first render does not pay the module load cost, swallowing a failure of that load without showing an error.

### Scenario: Nominal warm the render engine at activation

- GIVEN the extension just activated
- WHEN the first render runs
- THEN the engine is already loaded

### Scenario: Boundary or refusal of warm the render engine at activation

- GIVEN the warm-up import failed
- WHEN the activation runs
- THEN the failure is swallowed and the activation shows no error

### Verification notes

- Method: Unit test "the warm-up loads the engine once, shares it with the render and a warm-up call never throws" in test/core/render/renderReq.renderingCore.requirements.test.ts
- Criteria: One engine load is shared; a warm-up failure is swallowed.
