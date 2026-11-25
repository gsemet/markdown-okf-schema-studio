---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-004
uuid: 3d7d7c0f-a2a8-4082-b017-dc68c89fb1b0
title: A long render never blocks the text editor, and a render that a newer
  edit supersedes stops
description: When a preview renders a document in the VS Code host, the
  extension SHALL keep the text editor responsive during a long render, stop a
  render that a newer edit, a cancel or a closed preview supersedes, and still
  render when no background thread can start.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-005
scenarios:
- id: S1
  title: A long render leaves the host free
- id: S2
  title: A superseded render stops
- id: S3
  title: No background thread can run
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/renderPipeline.ts
- src/host-vscode/activation.ts
- src/host-vscode/vscodeHost.ts
- src/node-services/renderWorker.ts
- src/session/sessionFactory.ts
tested_in_files:
- test/core/render/renderPipeline.test.ts
- test/node-services/renderWorker.test.ts
default_owner_email: gaetan@xeberon.net
---

## A long render never blocks the text editor, and a render that a newer edit supersedes stops

### Normative behavior

When a preview renders a document in the VS Code host, the extension SHALL keep the text editor responsive during a long render, stop a render that a newer edit, a cancel or a closed preview supersedes, and still render when no background thread can start.

### Scenario S1 (nominal): A long render leaves the host free

- GIVEN a preview of an 11,000-line document in the VS Code host
- WHEN an edit triggers a render
- THEN the text editor stays responsive while the render runs, and the preview shows the same HTML, diagnostics and dependencies as any other render

### Scenario S2 (boundary): A superseded render stops

| Input | Outcome |
| --- | --- |
| a render whose request is aborted while it runs (a newer edit, a cancel, the preview closed) | the render stops at once and rejects as canceled; the next render starts normally |
| a render waiting its turn whose request is aborted | the render rejects as canceled and never starts |
| a render whose request was aborted before it started | the render never starts |
| the extension stops while a render runs | the render rejects as canceled |

### Scenario S3 (refusal): No background thread can run

| Input | Outcome |
| --- | --- |
| the worker script is missing or the thread fails before it is ready | the render, and every later one, still completes with the same output |
| a thread that was ready dies during a render | that render fails with the reason; after three such deaths in a row renders still complete |

### Verification notes

- Design (moved from the scenarios): the MyST render runs in a worker thread; an abort terminates the thread at once and the next render starts a fresh one; one warm thread starts with the first Studio preview (not at activation, which a Markdown file alone triggers) and loads the MyST engine before the first render; two renders at the same time wait for the thread, no second cold thread starts; an aborted render's thread is replaced by a new one at once; after 5 minutes without render the idle thread stops; a render aborted while its thread still starts keeps that thread for the next render; when no worker can start, or after three deaths in a row, renders run in-process.
- Method: test/node-services/renderWorker.test.ts: "renders in a worker thread, with the output of the in-process render" (deep-equal output, another thread id), "the host thread stays free while a worker renders" (longest gap of a 5 ms interval below half the render time with the worker, above half without), "an abort stops the render at once, and the next render gets a fresh worker", "a render given up before it starts never reaches a worker", "a worker that cannot start falls back to the in-process render", "disposing the renderer cancels the render in flight", "warming starts one thread that the first render then uses".
- Method: test/core/render/renderPipeline.test.ts "a render whose request was already given up never starts" and "the host's source renderer gets plain data and the signal, and its cancellation stays a cancellation".
- Method: test/node-services/renderWorker.test.ts with a stub worker script: "a ready worker that dies during a render fails that render; three deaths in a row fall back", "a render waits for the busy worker instead of starting a second thread", "a waiting render that is given up never reaches the worker", "a render aborted while its thread still starts keeps that thread for the next render".
- Method: the idle stop is checked in test/node-services/renderWorker.test.ts (a worker with a 40 ms idle restarts after 500 ms, one with a long idle does not); the VS Code wiring (vscodeHost.ts) runs in the integration suites through the bundle `out/bundle/renderWorker.js`.
- Criteria: the renderer's counters (workers started, aborted, worker and in-process renders) and the thread id of the last worker render; the abort settles in under 50 ms.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-005](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-005.md): The preview updates in place as the text and its dependencies change
<!-- okf:links:end -->
