---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-067
uuid: c38ecdda-1899-40f9-a200-e7f840fb9219
title: A link tooltip shows the fields and an excerpt of the linked file
description: "When a link annotation lists `tooltip_shows_fields`, `preview_shows_fields`
  or `show_line_number`, the extension SHALL show the details of the resolved target
  with the link, adding to its tooltip one \"name: value\" line per listed field found
  in the target's frontmatter (counting only string, number and boolean values), showing
  beside it an excerpt of the listed preview fields and the line of its marker, refreshing
  them when the target changes on disk, and presenting the tooltip on hover and focus
  until it closes."
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
depends_on:
- SwRS-MDOKFSTUDIO-FMSCHEMA-063
- SwRS-MDOKFSTUDIO-FMSCHEMA-046
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/fileLinks.ts
- src/core/frontmatter/propertiesTable.ts
- src/core/navigation/previewNavigation.ts
- src/node-services/linkedTargetWatch.ts
- src/page/features/linkTooltip.ts
tested_in_files:
- test/core/frontmatter/fileLinks.test.ts
- test/core/frontmatter/frontmatterFence.test.ts
- test/core/frontmatter/propertiesTable.test.ts
- test/core/navigation/previewNavigation.test.ts
- test/host-memory/memoryHostSession.test.ts
- test/integration/previewEditing.test.ts
- test/node-services/linkedTargetWatch.test.ts
- test/page/runtimeScroll.test.ts
- test/session/eventFanOut.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMSCHEMA-068
- SwRS-MDOKFSTUDIO-FMSCHEMA-069
- SwRS-MDOKFSTUDIO-FMSCHEMA-070
- SwRS-MDOKFSTUDIO-FMSCHEMA-071
- SwRS-MDOKFSTUDIO-FMSCHEMA-072
---
## A link tooltip shows the fields and an excerpt of the linked file

### Normative behavior

When a link annotation lists `tooltip_shows_fields`, `preview_shows_fields` or `show_line_number`, the extension SHALL show the details of the resolved target with the link, adding to its tooltip one "name: value" line per listed field found in the target's frontmatter (counting only string, number and boolean values), showing beside it an excerpt of the listed preview fields and the line of its marker, refreshing them when the target changes on disk, and presenting the tooltip on hover and focus until it closes.

### Scenario (nominal): Tooltip fields found

- GIVEN tooltip_shows_fields owner and count and a target whose frontmatter has owner Bob and count 3
- WHEN the table is rendered
- THEN the tooltip lists the path, then owner: Bob and count: 3

### Scenario (boundary): Tooltip fields missing or structured

| Listed field | Outcome |
| --- | --- |
| Absent from the target's frontmatter | Not in the tooltip |
| Holding a mapping (not a string, number or boolean) | Not in the tooltip |
| Target with a leading byte-order mark | Read normally |

### Scenario (nominal): Excerpt beside the link

| Setup | Outcome |
| --- | --- |
| preview_shows_fields description and a target whose description spans two lines | The excerpt shows the two lines joined by a single space (whitespace collapsed; several fields are joined by "; ") |
| An excerpt longer than the room | Clipped with an ellipsis by CSS; the excerpt element has the full text in its own title |
| A preview field that the target does not define | No excerpt is shown |

### Scenario (nominal): Line of the marker

- GIVEN basename_marker Evidence, id_marker id, the document id dd, show_line_number true and a target whose tenth line is Evidence dd
- WHEN the table is rendered
- THEN the link shows line 10 (the 1-based line of the first line of the target that carries the marker followed by the document identity)

### Scenario (boundary): No line label

| Input | Outcome |
| --- | --- |
| A target without a line carrying the marker and the identity | No line label is shown |
| An id_marker that names a field the document does not define | No line label is shown and the file name is not used instead |
| The line Evidence ddx while the identity is dd | Does not match (the identity must be followed by the end of the line or a character that is not a letter, digit, underscore or hyphen) |
| The line xEvidence dd | Does not match (the marker must start the line or follow whitespace) |
| An annotation without id_marker | The file name stem without extension of the document itself (not of the target) is the identity |

### Scenario (nominal): Details refresh when the target changes on disk

| Event | Outcome |
| --- | --- |
| A link showing a tooltip field of its target, and the target is saved with a new value | The link details are resolved again and show the new value |
| The target is created | The link details are resolved again |
| The target is deleted | The link turns into the not-found problem |

### Scenario (nominal): Tooltip opens on hover and focus

| Trigger | Outcome |
| --- | --- |
| The pointer rests on a resolved link near the middle of the page | A tooltip with its title appears below it, at most 480 px wide |
| A link at the bottom of the page is focused | The tooltip is placed above it and stays clear of the toolbar |
| A link that is pending | No tooltip (see SwRS-MDOKFSTUDIO-FMSCHEMA-063) |
| An invalid or unavailable span | Focusable, with the same tooltip |

### Scenario (nominal): Tooltip closes

| Trigger | Outcome |
| --- | --- |
| Escape is pressed | The tooltip is removed and the link has its title back |
| The page scrolls | The tooltip is removed |
| The page resizes, the pointer and focus leave the link, or a click lands elsewhere | The tooltip is removed |

### Known issues

- Known issue: a link whose annotation lists no tooltip field and no preview field and sets no show_line_number gets no watcher of its own and relies on the preview-wide watcher.

### Related requirements

- SwRS-MDOKFSTUDIO-FMSCHEMA-063: the link, its status and its first-paint state.
- SwRS-MDOKFSTUDIO-FMSCHEMA-046: the annotation fields that select the details.

### Verification notes

- Method: test/core/frontmatter/fileLinks.test.ts (tooltip fields, marker line, no matching line, identity rules), test/core/frontmatter/frontmatterFence.test.ts (byte-order mark), test/core/frontmatter/propertiesTable.test.ts (excerpt, no value), test/core/navigation/previewNavigation.test.ts (line of the marker), test/integration/previewEditing.test.ts (tooltip fields, marker line, target saved and deleted), test/node-services/linkedTargetWatch.test.ts (target watcher, direct watch), test/page/runtimeScroll.test.ts (hover, no room below, Escape, scroll and the other closing triggers), test/visual/scenarioDefinitions2.ts (excerpt).
- Method: test/session/eventFanOut.test.ts (previews linking one target share its host and direct watches; at most 256 targets are watched, a target past the cap gets none and relies on the preview-wide watcher and the save handler).
- Criteria: The clipping of the excerpt is done by CSS. The identity is the string value of the id_marker field of the document; the file name without extension is used only when the annotation has no id_marker. The folder of the target is watched without recursion and events naming the target (or no name) count; the watcher is backed by the preview-wide file watcher. While a tooltip is open, the link's title is removed and aria-describedby points to the tooltip; closing restores both. Invalid and unavailable spans are focusable and have the same tooltip.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-014](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-014.md): Frontmatter link fields resolve, show their status and can be followed
- Depends on:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-063](SwRS-MDOKFSTUDIO-FMSCHEMA-063.md): Each link value shows whether it resolves
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-046](SwRS-MDOKFSTUDIO-FMSCHEMA-046.md): x-okf-link annotations declare link fields and their syntax
- Supersedes:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-068](SwRS-MDOKFSTUDIO-FMSCHEMA-068.md): A link shows an excerpt of the linked file
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-069](SwRS-MDOKFSTUDIO-FMSCHEMA-069.md): A link can show the line of its marker
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-070](SwRS-MDOKFSTUDIO-FMSCHEMA-070.md): Linked file details refresh when the target changes on disk
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-071](SwRS-MDOKFSTUDIO-FMSCHEMA-071.md): A link tooltip appears on hover and focus
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-072](SwRS-MDOKFSTUDIO-FMSCHEMA-072.md): A link tooltip closes on leaving, Escape, scroll, resize and outside click
<!-- okf:links:end -->
