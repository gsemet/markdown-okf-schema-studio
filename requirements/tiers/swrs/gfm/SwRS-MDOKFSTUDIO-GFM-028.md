---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-028
uuid: 75ac6ea3-1f93-4b1e-9b93-6c0a4da533fd
title: Content patches clear pending toggles
description: When the preview content is patched in place, the extension SHALL
  discard pending checkbox toggles so an old result cannot revert the new
  content.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Content patches clear pending toggles

### Normative behavior

When the preview content is patched in place, the extension SHALL discard pending checkbox toggles so an old result cannot revert the new content.

### Scenario: Patch clears pending

- GIVEN a pending toggle of old content
- WHEN an in-place patch is applied and the old result arrives
- THEN the new content checkbox is unchanged

### Scenario: No pending toggle

- GIVEN no pending toggle
- WHEN a patch is applied
- THEN patching succeeds without effect on checkboxes

### Verification notes

- Method: Page unit test.
- Criteria: New content is unaffected by stale results.
