---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-070
uuid: 3792c40b-e6bd-4e2f-b98c-7f077844c75b
title: Linked file details refresh when the target changes on disk
description: When a displayed linked target is saved, created or deleted on
  disk, the extension SHALL refresh the link details, through a watcher on each
  displayed target backed by the preview-wide file watcher.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-067; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-067
default_owner_email: gaetan@xeberon.net
---

## Linked file details refresh when the target changes on disk

### Normative behavior

When a displayed linked target is saved, created or deleted on disk, the extension SHALL refresh the link details, through a watcher on each displayed target backed by the preview-wide file watcher.

### Scenario: Target saved

- GIVEN a link showing a tooltip field of its target and the target saved with a new value
- WHEN the change is noticed
- THEN the link details are resolved again and show the new value

### Scenario: Target deleted

- GIVEN the target deleted
- WHEN the change is noticed
- THEN the link turns into the not-found problem

### Verification notes

- Method: Integration test of the linked target watcher; unit test of the direct watch.
- Criteria: The folder of the target is watched without recursion and events naming the target (or no name) count.
- Known issue: a link whose annotation lists no tooltip field and no preview field and sets no show_line_number gets no watcher of its own and relies on the preview-wide watcher.
