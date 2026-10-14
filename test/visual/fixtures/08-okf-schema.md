---
type: swrs
title: "Brake pedal release detection"
status: active
owner: "Chassis Platform"
priority: 2
annotation_exemption: true
exemption_reason: "-"
reviewed_on: 2026-09-28
derives_from:
  - StRS-CORE-001
  - StRS-CORE-002
  - StRS-CORE-003
  - StRS-CORE-004
description: "System requirement for detecting release of the brake pedal."
---

# Brake pedal release detection

This page carries OKF frontmatter with a `type: swrs` field, so the preview
resolves the matching schema from the ancestor `_schema` directory and renders
the three-column properties table with per-field descriptions and type icons.

The release threshold is reviewed against the latest pedal travel measurement.

```{warning} Calibration gate
This warning must be acknowledged before
calibration.
```

| Review item | State | Expected behavior | Evidence | Verification |
| --- | :---: | --- | --- | --- |
| Brake release | approved | Sequences steps the controller must perform individually, in the platform's specific order and style. | Calibration measurements, release thresholds, and review records. | Run end-to-end; verify output matches the approved calibration. |
| Pedal travel | pending | Applies permanent constraints to **all measurements**, including `pedal_position` and [release detection](#brake-pedal-release-detection). | Coding standards, safety policies, and signal ranges. | Attempt invalid measurements; confirm the controller blocks or flags them. |
