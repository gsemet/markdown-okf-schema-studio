---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-002
uuid: daaece05-b7f1-4ab0-8874-7ff7c44244d3
title: A background failure is logged to the extension output channel
description: When a task the extension starts without waiting for it (a
  background write, a debounced refresh or a post to the page) is rejected, the
  extension SHALL report the failure to the logger of the host, the Markdown
  OKF-Schema Studio output channel in VS Code, instead of leaving an unhandled
  rejection or writing to the console.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/host-api/logger.ts
- src/host-memory/memoryLogger.ts
- src/host-vscode/vscodeHost.ts
tested_in_files:
- test/host-memory/memoryHost.test.ts
- test/session/diagReq.viewState.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## A background failure is logged to the extension output channel

### Normative behavior

When a task the extension starts without waiting for it (a background write, a debounced refresh or a post to the page) is rejected, the extension SHALL report the failure to the logger of the host, the Markdown OKF-Schema Studio output channel in VS Code, instead of leaving an unhandled rejection or writing to the console.

### Scenario (nominal): A rejected background task is logged

- GIVEN a host whose logger records its entries and a background task that rejects with an error
- WHEN the extension starts the task with fireAndForget under a context such as "Saving the choice"
- THEN the logger receives one error entry "Saving the choice failed." carrying the error, and no unhandled rejection is raised

### Scenario (boundary): A task that succeeds or does not exist logs nothing

- GIVEN a background task that resolves, or an optional call that returned no task
- WHEN the extension starts it with fireAndForget
- THEN the logger receives no entry

### Scenario (nominal): A rejected storage write reaches the logger of the host

- GIVEN workspace storage whose update rejects
- WHEN the reader changes a view preference
- THEN the logger of the host receives the error entry "Failed to persist the Markdown preview view preferences." and nothing is written to the console

### Verification notes

- Method: test/host-memory/memoryHost.test.ts (a rejected task is recorded by the memory logger, a resolved or missing one is not) and test/session/diagReq.viewState.requirements.test.ts (a rejected storage write is recorded by the logger of the host).
- Criteria: the entry names the context and carries the error; the source of src/ writes nothing to the console.
