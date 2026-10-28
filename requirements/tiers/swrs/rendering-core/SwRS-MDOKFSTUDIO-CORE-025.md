---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-025
uuid: 8b221f5d-5966-4f13-bade-745410c4c040
title: A failed render keeps the previous page and lists its diagnostics
description: When a render fails with an exception or yields diagnostics, the
  extension SHALL list each diagnostic in the status region as a file, a line
  and a message with a severity, and on a failure keep the failure message and
  mark the previous page as stale, or show an error page when no previous page
  exists.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-003
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/previewStatus.ts
- src/session/features/rendering.ts
tested_in_files:
- test/core/render/renderPipeline.test.ts
- test/node-services/build/buildQueue.test.ts
- test/page/runtimeContentPatch.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CORE-024
---

## A failed render keeps the previous page and lists its diagnostics

### Normative behavior

When a render fails with an exception or yields diagnostics, the extension SHALL list each diagnostic in the status region as a file, a line and a message with a severity, and on a failure keep the failure message and mark the previous page as stale, or show an error page when no previous page exists.

### Scenario (nominal): Diagnostics listed
- GIVEN a render with one warning on line 3
- WHEN it is displayed
- THEN the status region shows the file, line 3 and the message with the warning severity

### Scenario (boundary): No diagnostics
- GIVEN a render without diagnostics
- WHEN it is displayed
- THEN the diagnostic list is empty

### Scenario (nominal): Failure after a good render
- GIVEN a page rendered earlier and a later render that throws
- WHEN the failure occurs
- THEN the old page stays, marked stale ("Preview is stale"), and the failure message is kept ("The latest render failed." when the failure carries no message)

### Scenario (refusal): Failure of the first render
- GIVEN a first render that throws
- WHEN the failure occurs
- THEN an error page ("Preview unavailable") shows the message ("The render failed." when the failure carries no message)

### Verification notes
- Method: test/core/render/renderPipeline.test.ts, test "the render pipeline retains buffer identity and attaches source diagnostics" (diagnostics listed)
- Method: test/page/runtimeContentPatch.test.ts, test "T34: the patch rebuilds the status region from plain text" (diagnostics listed with file, line, message and severity; no diagnostics)
- Method: test/node-services/build/buildQueue.test.ts, test "retains a successful result as stale after a failed newer build" (failure after a good render)
- Criteria: Each listed item shows file, line, message and severity; a failed render never blanks a good page; with none it shows an error page. The failure of the first render is not asserted by a named test (untested).
