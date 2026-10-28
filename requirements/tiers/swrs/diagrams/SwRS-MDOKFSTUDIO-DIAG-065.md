---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-065
uuid: 9f3e8944-63cc-4c72-a50c-7810042e9846
title: A changed include file tells the page
description: When a file that the built-in engine read, or asked for in vain
  inside the allowed folders, changes on disk, the host SHALL send
  previewPlantUmlIncludesChanged to the page, after an open block editor closes.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-053; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-053
default_owner_email: gaetan@xeberon.net
---

## A changed include file tells the page

### Normative behavior

When a file that the built-in engine read, or asked for in vain inside the allowed folders, changes on disk, the host SHALL send previewPlantUmlIncludesChanged to the page, after an open block editor closes.

### Scenario: File changed

- GIVEN an include file remembered by the watch
- WHEN it changes on disk
- THEN the page receives previewPlantUmlIncludesChanged and draws the diagrams that read files again

### Scenario: Editor open

- GIVEN an open block editor
- WHEN an included file changes
- THEN the message is sent after the editor closes

### Known issues

- Known issue: The watcher event to notifyIncludesChanged and the deferral while editing have no session test.

### Verification notes

- Method: Unit test of the include watch and of the page message; the host event path has no session test.
- Criteria: Watched changes notify the page once the editor is closed.
