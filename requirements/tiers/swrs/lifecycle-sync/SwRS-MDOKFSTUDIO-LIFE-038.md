---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-038
uuid: 814e0d2d-613b-48b7-9872-605651f27cd7
title: Each preview has its own state and only the newest follows
description: When several previews are open, the extension SHALL give each its
  own session with its own document, render queue, file watchers and reading
  state, and, when VS Code restores several panels, let only the newest follow
  the active editor, the older ones becoming fixed previews titled with the bare
  file name.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-001
- StRS-MDOKFSTUDIO-LIFE-014
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/host-vscode/activation.ts
- src/session/sessionFactory.ts
tested_in_files:
- test/integration/serializer.test.ts
---

## Each preview has its own state and only the newest follows

### Normative behavior

When several previews are open, the extension SHALL give each its own session with its own document, render queue, file watchers and reading state, and, when VS Code restores several panels, let only the newest follow the active editor, the older ones becoming fixed previews titled with the bare file name.

### Scenario (nominal): Two previews

- GIVEN a side preview of a.md and an Open With tab of b.md
- WHEN a.md changes
- THEN only the side preview renders again and only its queue shows a state

### Scenario (nominal): Same document twice

- GIVEN the side preview and an Open With tab both show a.md
- WHEN a.md changes
- THEN both render the new text, each on its own schedule

### Scenario (nominal): Two restored panels

- GIVEN two saved panels of the same file
- WHEN VS Code restores both
- THEN two sessions are live, the roles are [fixed, following], and the older title does not start with Studio

### Scenario (boundary): One restored panel

- GIVEN a single restored panel
- WHEN VS Code restores it
- THEN it follows the active editor

### Verification notes

- Method: test/integration/serializer.test.ts asserts two live sessions (getLivePreviewRolesForTests length 2) and, for two restored panels, the roles [false, true] (followsActiveEditor) and the older title (two restored panels coexist); the independence of the queues and watchers (two previews, same document twice) is by reading createSession; the single restored panel is untested.
- Criteria: manager.sessions() holds one session per panel and each owns a BuildQueue and a watcher; getLivePreviewRolesForTests returns followsActiveEditor [false, true].
