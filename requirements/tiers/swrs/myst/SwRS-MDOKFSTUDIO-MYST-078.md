---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-078
uuid: 6377a8d6-80cb-450b-aaaa-3d8bcdb1c131
title: Extension warnings appear in the Problems view and follow conf.py
description: When a live preview shows a document with extension warnings in a
  trusted workspace, the extension SHALL publish them to the Problems view as
  whole-line warnings from Markdown OKF-Schema Studio with code myst-extension,
  the line clamped to the document length, replace or remove them when the
  document re-renders, its preview closes or its document changes, and re-render
  the open previews a created, edited or deleted conf.py governs.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
depends_on: []
scenarios:
- id: S1
  title: A warning becomes a Problems entry
- id: S2
  title: The line is clamped to the document
- id: S3
  title: An untrusted workspace publishes nothing
- id: S4
  title: Entries are replaced and removed
- id: S5
  title: A conf.py change updates the previews it governs
- id: S6
  title: A conf.py that governs nothing re-renders nothing
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/diagnostics.ts
- src/session/hostEvents.ts
tested_in_files:
- test/integration/mystDiagnostics.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-MYST-079
- SwRS-MDOKFSTUDIO-MYST-080
---

## Extension warnings appear in the Problems view and follow conf.py

### Normative behavior

When a live preview shows a document with extension warnings in a trusted workspace, the extension SHALL publish them to the Problems view as whole-line warnings from Markdown OKF-Schema Studio with code myst-extension, the line clamped to the document length, replace or remove them when the document re-renders, its preview closes or its document changes, and re-render the open previews a created, edited or deleted conf.py governs.

### Scenario S1 (nominal): A warning becomes a Problems entry
- GIVEN a trusted workspace and a warning on line 3
- WHEN the preview renders
- THEN a Problems entry and an underline appear on line 3

### Scenario S2 (boundary): The line is clamped to the document
- GIVEN a warning line beyond the document length
- WHEN it is published
- THEN the line is clamped

### Scenario S3 (refusal): An untrusted workspace publishes nothing
- GIVEN a workspace that is not trusted
- WHEN the preview renders a document with extension warnings
- THEN no Problems entry is published

### Scenario S4 (nominal): Entries are replaced and removed
- GIVEN a new render with fewer warnings
- WHEN it completes
- THEN old entries are replaced

| Input | Outcome |
| --- | --- |
| The preview closes | no entries remain |
| The document changes | its entries are replaced or removed |

### Scenario S5 (nominal): A conf.py change updates the previews it governs
- GIVEN a conf.py that is created, edited or deleted
- WHEN the watcher fires
- THEN exactly the open previews it governs re-render without reopening, deferred while a block edit is open, and warnings come or go

### Scenario S6 (refusal): A conf.py that governs nothing re-renders nothing
- GIVEN a conf.py governing nothing, or an ignored path such as node_modules
- WHEN the watcher fires
- THEN nothing re-renders

### Verification notes
- Method: test/integration/mystDiagnostics.test.ts (suite run() and runUntrusted(): entries, underline, clamp, untrusted, replacement and removal, conf.py watcher and ignored paths)
- Criteria: Entries are tied to a live preview. The event order of a conf.py change before or after the open does not matter. The controller has no unit test of its own (integration only).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-007](../../strs/myst/StRS-MDOKFSTUDIO-MYST-007.md): Sphinx configuration gaps are reported before building
- Supersedes:
  - [SwRS-MDOKFSTUDIO-MYST-079](SwRS-MDOKFSTUDIO-MYST-079.md): Problems entries are replaced and removed
  - [SwRS-MDOKFSTUDIO-MYST-080](SwRS-MDOKFSTUDIO-MYST-080.md): conf.py changes update the previews they govern
<!-- okf:links:end -->
