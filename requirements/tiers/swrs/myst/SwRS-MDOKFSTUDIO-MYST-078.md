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
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/diagnostics.ts
- src/session/hostEvents.ts
tested_in_files:
- test/integration/mystDiagnostics.test.ts
---

## Extension warnings appear in the Problems view and follow conf.py

### Normative behavior

When a live preview shows a document with extension warnings in a trusted workspace, the extension SHALL publish them to the Problems view as whole-line warnings from Markdown OKF-Schema Studio with code myst-extension, the line clamped to the document length, replace or remove them when the document re-renders, its preview closes or its document changes, and re-render the open previews a created, edited or deleted conf.py governs.

### Scenario (nominal): A warning becomes a Problems entry
- GIVEN a trusted workspace and a warning on line 3
- WHEN the preview renders
- THEN a Problems entry and an underline appear on line 3

### Scenario (boundary): The line is clamped to the document
- GIVEN a warning line beyond the document length
- WHEN it is published
- THEN the line is clamped

### Scenario (refusal): An untrusted workspace publishes nothing
- GIVEN a workspace that is not trusted
- WHEN the preview renders a document with extension warnings
- THEN no Problems entry is published

### Scenario (nominal): Entries are replaced and removed
- GIVEN a new render with fewer warnings
- WHEN it completes
- THEN old entries are replaced

| Input | Outcome |
| --- | --- |
| The preview closes | no entries remain |
| The document changes | its entries are replaced or removed |

### Scenario (nominal): A conf.py change updates the previews it governs
- GIVEN a conf.py that is created, edited or deleted
- WHEN the watcher fires
- THEN exactly the open previews it governs re-render without reopening, deferred while a block edit is open, and warnings come or go

### Scenario (refusal): A conf.py that governs nothing re-renders nothing
- GIVEN a conf.py governing nothing, or an ignored path such as node_modules
- WHEN the watcher fires
- THEN nothing re-renders

### Scenario (nominal): The warning banner opens the Problems view
Message type previewShowProblems (page to host): the envelope fields only (documentId, revision, requestId), no further field. See SwRS-MDOKFSTUDIO-TRUST-052 for the envelope and SwRS-MDOKFSTUDIO-TRUST-065 for the document gate.
- GIVEN a preview showing a document with warnings
- WHEN the page posts previewShowProblems for the shown document
- THEN the host opens the Problems view; opening it edits nothing, so a read-only or untrusted preview is allowed

### Scenario (refusal): A malformed or mismatched previewShowProblems is ignored
| Input | Outcome |
| --- | --- |
| previewShowProblems without the envelope | not a registered message; ignored, no handler runs |
| previewShowProblems whose documentId is not the shown document | dropped by the document gate; the Problems view is not opened |

### Verification notes
- Method: test/integration/mystDiagnostics.test.ts (suite run() and runUntrusted(): entries, underline, clamp, untrusted, replacement and removal, conf.py watcher and ignored paths)
- Method: test/core/protocol/pageToHost.test.ts (previewShowProblems registered; the envelope is required)
- Method: test/session/trustReq.requirements.test.ts (previewShowProblems handled for the shown document and dropped for another one)
- Method: test/page/modules/warningBanner.test.ts (the banner posts previewShowProblems with the envelope)
- Criteria: Entries are tied to a live preview. The event order of a conf.py change before or after the open does not matter. The controller has no unit test of its own (integration only).
