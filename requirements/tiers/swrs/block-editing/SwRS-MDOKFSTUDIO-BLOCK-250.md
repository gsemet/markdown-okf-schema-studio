---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-250
uuid: ef20cdd7-8812-4ff8-be45-7695411bff7b
title: The trace names the nearest callers of an event
description: When a trace event is recorded with a stack, callers SHALL name the
  nearest named functions of that stack, innermost first, joined by " < ".
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

## The trace names the nearest callers of an event

### Normative behavior

When a trace event is recorded with a stack, callers SHALL name the nearest named functions of that stack, innermost first, joined by " < ".

### Scenario: V8 stack

- GIVEN an error stack with functions traceStack, closeFrontmatterEditor, saveValue and a handler
- WHEN callers is called with a skip of 1
- THEN it returns the names closeFrontmatterEditor, saveValue and the name of the event handler, joined by " < "

### Scenario: Other engine or no stack

- GIVEN a stack of the form name@file:line:col, or no stack
- WHEN callers is called
- THEN the names are read from that form, or an empty string is returned

### Verification notes

- Method: Unit test `CR 041: callers names the nearest named functions of a stack` in test/page/modules/editorTrace.test.ts.
- Criteria: At most three names are returned.
