---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-004
uuid: 3d7d7c0f-a2a8-4082-b017-dc68c89fb1b0
title: Previews render in a worker thread that an abort stops
description: When a preview renders a document in the VS Code host, the
  extension SHALL run the MyST render in a worker thread, stop that thread when
  the render is aborted, and render in-process when no worker can start.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-005
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/renderPipeline.ts
- src/host-vscode/vscodeHost.ts
- src/node-services/renderWorker.ts
- src/session/sessionFactory.ts
tested_in_files:
- test/core/render/renderPipeline.test.ts
- test/node-services/renderWorker.test.ts
---

## Previews render in a worker thread that an abort stops

### Normative behavior

When a preview renders a document in the VS Code host, the extension SHALL run the MyST render in a worker thread, stop that thread when the render is aborted, and render in-process when no worker can start.

### Scenario (nominal): A long render leaves the host free

- GIVEN a preview of an 11,000-line document in the VS Code host
- WHEN an edit triggers a render
- THEN the MyST render runs in a worker thread, not on the extension host thread, and the preview shows the same HTML, diagnostics and dependencies as an in-process render

### Scenario (boundary): Aborted renders

| Input | Outcome |
| --- | --- |
| a render whose request is aborted while the worker renders (a newer edit, a cancel, the preview closed) | the worker thread is terminated at once, the render rejects as canceled, and the next render starts a fresh worker |
| a render whose request is aborted while its thread still starts | the render rejects as canceled, the thread is not stopped and never gets that render; the next render uses it |
| a render waiting for the busy thread whose request is aborted | the render rejects as canceled and never reaches the thread |
| a render whose request was aborted before it started | no worker is used and the render never starts |
| the extension stops while a render runs | the render rejects as canceled and the workers are terminated |

### Scenario (boundary): One warm thread

| Input | Outcome |
| --- | --- |
| the extension activates | one worker thread starts and loads the MyST engine before the first render |
| two renders at the same time (two documents) | the second waits for the thread; no second, cold thread starts |
| an aborted render | its thread is replaced by a new one at once, warm for the next render |
| no render for 5 minutes | the idle thread stops; the next render starts a new one |

### Scenario (refusal): No worker can run

| Input | Outcome |
| --- | --- |
| the worker script is missing or the thread fails before it is ready | the render, and every later one, runs in-process with the same output |
| a worker that was ready dies during a render | that render fails with the reason (it is not repeated on the host thread); after three such deaths in a row renders run in-process |

### Verification notes

- Method: test/node-services/renderWorker.test.ts: "renders in a worker thread, with the output of the in-process render" (deep-equal output, another thread id), "the host thread stays free while a worker renders" (longest gap of a 5 ms interval below half the render time with the worker, above half without), "an abort stops the render at once, and the next render gets a fresh worker", "a render given up before it starts never reaches a worker", "a worker that cannot start falls back to the in-process render", "disposing the renderer cancels the render in flight", "warming starts one thread that the first render then uses".
- Method: test/core/render/renderPipeline.test.ts "a render whose request was already given up never starts" and "the host's source renderer gets plain data and the signal, and its cancellation stays a cancellation".
- Method: test/node-services/renderWorker.test.ts with a stub worker script: "a ready worker that dies during a render fails that render; three deaths in a row fall back", "a render waits for the busy worker instead of starting a second thread", "a waiting render that is given up never reaches the worker", "a render aborted while its thread still starts keeps that thread for the next render".
- Method: the idle stop is untested; the VS Code wiring (vscodeHost.ts) runs in the integration suites through the bundle `out/bundle/renderWorker.js`.
- Criteria: the renderer's counters (workers started, aborted, worker and in-process renders) and the thread id of the last worker render; the abort settles in under 50 ms.
