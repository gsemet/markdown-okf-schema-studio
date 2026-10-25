---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-249
uuid: d34d63b8-0587-4013-bdeb-55dbc7fa25d5
title: The editor events are kept in a short trace
description: While a page runs, it SHALL keep its last 40 editor events in a
  trace, each with the time since the page started, the event name, and an
  optional detail and caller stack.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-026
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The editor events are kept in a short trace

### Normative behavior

While a page runs, it SHALL keep its last 40 editor events in a trace, each with the time since the page started, the event name, and an optional detail and caller stack.

### Scenario: Overflow

- GIVEN a trace of limit 3 and four events
- WHEN the entries are read
- THEN only the last three remain, with their time since the start

### Scenario: Copies

- GIVEN the entries are read and changed
- WHEN they are read again
- THEN the trace is unchanged

### Verification notes

- Method: Unit test `CR 041: the editor trace keeps the last entries with their time since the page started` in test/page/modules/editorTrace.test.ts. The page uses a limit of 40 (src/page/pageDiagnostics.ts) and exposes the trace as window.__studioDiagnostics.trace.
- Criteria: entries() returns copies in order, at most the limit.
