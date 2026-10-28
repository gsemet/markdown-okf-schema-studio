---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-021
uuid: adad3354-3e9b-4fd4-b49e-c82a373217b4
title: Refuse the render when trust is required
description: When a document is rendered in an untrusted workspace and the
  reduced mode is not allowed, the render pipeline SHALL refuse with the message
  "The MyST preview is disabled until the workspace is trusted."
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-001
default_owner_email: gaetan@xeberon.net
---

## Refuse the render when trust is required

### Normative behavior

When a document is rendered in an untrusted workspace and the reduced mode is not allowed, the render pipeline SHALL refuse with the message "The MyST preview is disabled until the workspace is trusted."

### Scenario: Nominal refuse the render when trust is required

- GIVEN an untrusted workspace without reduced mode
- WHEN a render is requested
- THEN it fails with the trust message

### Scenario: Boundary or refusal of refuse the render when trust is required

- GIVEN reduced mode allowed
- WHEN a render is requested
- THEN the render succeeds

### Verification notes

- Method: Unit test "the trust gate prevents renderer invocation unless reduced mode is allowed" in test/core/render/renderPipeline.test.ts
- Criteria: The pipeline throws the trust message only without the reduced-mode allowance.

Production always passes `allowUntrusted: true`, so this refusal is a guard; the test is at pipeline level. Trust behaviour belongs to a future trust-security StRS.
