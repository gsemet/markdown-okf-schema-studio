---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-014
uuid: 80935d1d-8b0e-4b9a-950e-ff8bfabc5bc4
title: The Description column collapses and the choice is kept per document
description: When a writer presses the toggle in a column header of a schema
  table, the extension SHALL collapse or restore the Description column while
  keeping Name and Value readable, and store the choice for that document in the
  workspace state so that a refresh or a new preview of the document restores
  it.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
- StRS-MDOKFSTUDIO-LIFE-014
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/propertiesTable.ts
- src/core/state/boundedState.ts
- src/page/features/pageInput.ts
- src/page/runtime.ts
- src/session/workspaceChoices.ts
tested_in_files:
- test/core/frontmatter/propertiesTable.test.ts
- test/core/state/boundedState.test.ts
- test/host/lifeReq.requirements.test.ts
- test/integration/previewEditing.test.ts
- test/page/runtimeScroll.test.ts
- test/visual/scenarioDefinitions1.ts
---

## The Description column collapses and the choice is kept per document

### Normative behavior

When a writer presses the toggle in a column header of a schema table, the extension SHALL collapse or restore the Description column while keeping Name and Value readable, and store the choice for that document in the workspace state so that a refresh or a new preview of the document restores it.

### Scenario (nominal): Collapse

- GIVEN a schema table with the Description column shown
- WHEN the writer presses the toggle labelled Collapse Description column
- THEN the column is hidden, the toggle label becomes Expand Description column and alert rows span two columns

### Scenario (nominal): Restore

- GIVEN the same table with the column collapsed
- WHEN the writer presses the toggle labelled Expand Description column
- THEN the column is shown again and alert rows span three columns

### Scenario (nominal): The choice is stored for the workspace

- GIVEN a writer collapsed the Description column of a.md
- WHEN the page reports its state, then the preview is refreshed or reopened for a.md
- THEN the workspace state holds a.md as collapsed and the column is still collapsed in a new preview of a.md

### Scenario (boundary): Start state of the column

| Input | Outcome |
| --- | --- |
| A document with no remembered choice, in a preview 640 px wide at page start | The Description column starts collapsed |
| A document with no remembered choice, in a preview 641 px wide at page start | The Description column starts shown |
| A document with an explicit remembered choice, in a narrow preview | The explicit choice is kept; the narrow default does not override it |
| A restored panel state with descriptionsCollapsed false, and a stored choice of true for the document | The saved panel value is used and the stored one is not applied |
| A new session for a document without a saved panel value | The stored choice of the document is read and applied |

### Scenario (boundary): At most 200 documents

| Input | Outcome |
| --- | --- |
| Choices stored for 201 documents, the oldest document opened again | Its choice is forgotten and the default applies |
| A choice read or written again, then a 201st choice stored | The choice used last is kept |

### Scenario (boundary): Old one-key-per-document choices

| Input | Outcome |
| --- | --- |
| Three legacy keys of the form descriptionsCollapsed:{uri} and an empty map | The map holds the three documents and the legacy keys are deleted |
| A legacy key for a document that the map already holds | The map's value is kept |

### Scenario (refusal): Malformed stored value

| Input | Outcome |
| --- | --- |
| A stored value that is a string | The map is empty |
| A stored list with a pair that holds a number instead of a boolean | The valid pairs are kept and that pair is dropped |

### Known issues

- Known issue: resizing the preview after page start does not change the choice.
- Known issue: the stored choice is read only when a session is created and not after a switch inside one session; see SwRS-MDOKFSTUDIO-LIFE-125.

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-125: the reading state of recent documents, saved within bounds.

### Verification notes

- Method: `test/core/frontmatter/propertiesTable.test.ts` (collapse and restore markup: aria-expanded, aria-label and title follow the state; colspan of alert rows).
- Method: `test/page/runtimeScroll.test.ts` (toggle persists and restores both states; narrow start; explicit choice not overridden; the width is measured once, at page start, window.innerWidth <= 640).
- Method: `test/integration/previewEditing.test.ts` (collapse state recorded by the host and restored after a refresh) and `test/visual/scenarioDefinitions1.ts` (visual scenario v02 and the 460 px scenarios).
- Method: `test/host/lifeReq.requirements.test.ts`, unit test `the Description column choice of a document is stored for the workspace and read at creation` (stored choice; saved panel state wins).
- Method: `test/core/state/boundedState.test.ts` (200-entry cap and recency: `migration respects the cap`, `reading an entry protects it from eviction, peek does not`; legacy keys: `migration folds legacy keys into the map, preserves values and deletes the old keys`, `migration is a no-op without legacy keys and keeps newer map entries over legacy ones`; malformed value: `loading ignores a malformed stored value`).
- Criteria: The colspan of info rows is 3 with docs and 2 otherwise. The map holds 200 entries (MAX_DOCUMENT_STATES), most recently used last, persisted under one workspace key; loadCollapsedMap and saveCollapsedMap hold at most 200 entries and return only valid pairs; no legacy key remains and the map values of existing entries are unchanged.
