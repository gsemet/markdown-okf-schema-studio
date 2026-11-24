---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-194
uuid: 349207e2-5e96-4c10-a32b-ddaadf5ca6ec
title: The line marker marks the front matter property row of the line
description: When the line marker is requested on a line of the front matter,
  the page SHALL mark the properties table row of the property that holds the
  line (a multi-line value included) and expand a collapsed properties table
  first, and SHALL mark the top of the properties table, leaving a collapsed
  table collapsed, for a line that is no property line (a fence, a comment, a
  blank line).
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-023
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/lineMarkerPlacement.ts
tested_in_files:
- test/page/runtimeLineMarkerPlacement.test.ts
- test/visual/lineMarkerScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## The line marker marks the front matter property row of the line

### Normative behavior

When the line marker is requested on a line of the front matter, the page SHALL mark the properties table row of the property that holds the line (a multi-line value included) and expand a collapsed properties table first, and SHALL mark the top of the properties table, leaving a collapsed table collapsed, for a line that is no property line (a fence, a comment, a blank line).

### Scenario (nominal): A property line

- GIVEN a file whose front matter has the line `owner: alice`, rendered with its properties table
- WHEN the page receives previewRevealLine for that line
- THEN one arrow and band are drawn on the owner row of the properties table

### Scenario (boundary): Values, fences and the collapsed table

| Input | Outcome |
| --- | --- |
| a line inside a list value of a property | the marker sits on the row of that property |
| a fence or a comment line | the marker sits at the top of the properties table |
| a collapsed properties table and a property line | the table expands and the row is marked |
| a collapsed properties table and a fence or comment line | the table stays collapsed and the top is marked |
| the reader collapses the table later | the marker is not drawn until the table shows again, and a later placement never expands it |

### Verification notes

- Method: test/page/runtimeLineMarkerPlacement.test.ts (key line, list value, comment, collapsed table, collapsed again), test/core/frontmatter/propertiesTable.test.ts (the closing fence line of the section) and the CR-457 visual scenarios (they run on Linux and macOS CI, not on Windows).
- Criteria: each outcome of the tables above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
<!-- okf:links:end -->
