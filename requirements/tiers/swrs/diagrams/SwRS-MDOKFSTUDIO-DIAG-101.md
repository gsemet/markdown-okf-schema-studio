---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-101
uuid: b5534041-4909-4b12-af3f-0be2bd9c0c61
title: "Cancelling a render stops the PlantUML process group"
description: "When a render is cancelled by a newer render stage or the closing of
  the preview, the extension SHALL send SIGTERM to the whole process group of the
  PlantUML process on POSIX, falling back to the direct child."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-097; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-097
---

## Cancelling a render stops the PlantUML process group

### Normative behavior

When a render is cancelled by a newer render stage or the closing of the preview, the extension SHALL send SIGTERM to the whole process group of the PlantUML process on POSIX, falling back to the direct child.

### Scenario: Cancel

- GIVEN a running PlantUML process on POSIX
- WHEN the render is cancelled
- THEN SIGTERM goes to the process group

### Scenario: Already exited

- GIVEN a process that has already exited
- WHEN the render is cancelled
- THEN no signal is sent to it

### Known issues

- Known issue: Windows, which has no process group, is untested.

### Verification notes

- Method: Unit tests: cancels an active PlantUML process; spawns detached and kills the process group on POSIX; abort falls back to child.kill; does not group-kill a child that already exited.
- Criteria: Group kill with fallback; exited children untouched.
