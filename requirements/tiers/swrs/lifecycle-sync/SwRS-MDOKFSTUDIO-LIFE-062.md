---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-062
uuid: a9f5d96a-2945-4737-88bf-8ce01c088b24
title: A preview without a source says why and recovers when it returns
description: When the source of a preview is not an existing Markdown file
  inside its root, the extension SHALL replace the page by the status Preview
  source missing with the reason of the case, and render the source again when
  its file is created.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-007
- StRS-MDOKFSTUDIO-TRUST-004
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/rendering.ts
- src/session/hostEvents.ts
- src/session/previewManager.ts
tested_in_files:
- test/host/lifeReq.requirements.test.ts
- test/integration/serializer.test.ts
---

## A preview without a source says why and recovers when it returns

### Normative behavior

When the source of a preview is not an existing Markdown file inside its root, the extension SHALL replace the page by the status Preview source missing with the reason of the case, and render the source again when its file is created.

### Scenario (nominal): Deleted file

- GIVEN a ready preview of a.md and a.md deleted on disk
- WHEN the watcher reports the deletion
- THEN the page is replaced by Preview source missing with the message The active Markdown source was deleted.; the queue is cancelled and the old HTML and reading state are gone

### Scenario (nominal): Restored panel

- GIVEN a restored panel whose file no longer exists
- WHEN the panel is restored
- THEN it shows the same status Preview source missing (integration test test/integration/serializer.test.ts, missing-source status)

### Scenario (boundary): Reason of each case

| Input | Outcome |
| --- | --- |
| A new preview for a file that does not exist | Preview source missing with the message The active Markdown source is unavailable. |
| A change event for a document whose file vanished | Preview source missing with the message The active Markdown source is unavailable. |
| requestDocument called with an untitled document (not a saved .md file) | Preview source missing with the message The restored or active source is not a Markdown file. |
| The shown a.md is deleted | Preview source missing with the message The active Markdown source was deleted. |
| The reader renames or moves a.md to b.md | Preview source missing with the message The active Markdown source was renamed or deleted. |
| The file resolves, once symbolic links are resolved, outside the session's resource root (a symlink out) | Preview source missing; the source counts as unavailable |
| A saved .md file below the root | It renders |
| An included file (not the shown source) is deleted | The preview renders again instead of showing the status |
| An included file is renamed | The document renders again (see SwRS-MDOKFSTUDIO-LIFE-044) |

### Scenario (nominal): Recreated source

- GIVEN a preview showing Preview source missing for a.md
- WHEN a.md is created again below the root
- THEN the preview renders a.md without any command

### Scenario (refusal): Created file is not the source

- GIVEN a preview showing Preview source missing and a created file that is not the shown source
- WHEN the file is created
- THEN the preview stays on the status page

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-044: a changed or renamed dependency renders the document again

### Verification notes

- Method: test/integration/serializer.test.ts (Restored panel, missing-source status of a restored panel).
- Method: test/host/lifeReq.requirements.test.ts (Deleted file, Reason of each case, Recreated source, Created file is not the source): "deleting the shown file shows The active Markdown source was deleted.", "renaming the shown file shows The active Markdown source was renamed or deleted.", "the default reason of a missing source is The active Markdown source is unavailable.", "a document that is not a saved .md file shows The restored or active source is not a Markdown file.", "a source whose symbolic link leaves the root counts as missing", "a missing source that comes back renders again by itself".
- Criteria: status is missing-source, stage is undefined and the queue state is canceled; the status message reads as the table says; sourceAvailable is false for a path outside the root or for a directory (isPathWithin on canonical paths, and the file must exist as a regular file); refreshPreviewDocument runs only when the source is available.
