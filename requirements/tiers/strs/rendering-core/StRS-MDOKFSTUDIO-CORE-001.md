---
type: StRS
id: StRS-MDOKFSTUDIO-CORE-001
uuid: 689c328e-435b-4127-b966-0216d0ce52fb
title: A reader reads a faithful rendering of any document
description: When a writer opens or edits a Markdown file, the Studio SHALL show
  a rendered preview of its content beside the editor that follows each edit and
  displays text in any script and direction readably inside the preview column.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: Writers need to read their Markdown as formatted text, at any length,
  in any script and direction, while they type.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-001
- SwRS-MDOKFSTUDIO-CORE-002
- SwRS-MDOKFSTUDIO-CORE-003
- SwRS-MDOKFSTUDIO-CORE-004
- SwRS-MDOKFSTUDIO-CORE-005
- SwRS-MDOKFSTUDIO-CORE-006
- SwRS-MDOKFSTUDIO-CORE-007
- SwRS-MDOKFSTUDIO-CORE-008
- SwRS-MDOKFSTUDIO-CORE-010
- SwRS-MDOKFSTUDIO-CORE-011
- SwRS-MDOKFSTUDIO-CORE-020
- SwRS-MDOKFSTUDIO-CORE-021
- SwRS-MDOKFSTUDIO-CORE-027
- SwRS-MDOKFSTUDIO-CORE-028
- SwRS-MDOKFSTUDIO-CORE-029
- SwRS-MDOKFSTUDIO-CORE-030
- SwRS-MDOKFSTUDIO-CORE-031
- SwRS-MDOKFSTUDIO-CORE-032
- SwRS-MDOKFSTUDIO-CORE-033
- SwRS-MDOKFSTUDIO-CORE-034
- SwRS-MDOKFSTUDIO-CORE-035
- SwRS-MDOKFSTUDIO-CORE-037
- SwRS-MDOKFSTUDIO-CORE-038
- SwRS-MDOKFSTUDIO-CORE-039
- SwRS-MDOKFSTUDIO-CORE-040
- SwRS-MDOKFSTUDIO-CORE-041
- SwRS-MDOKFSTUDIO-CORE-042
- SwRS-MDOKFSTUDIO-CORE-043
- SwRS-MDOKFSTUDIO-CORE-044
- SwRS-MDOKFSTUDIO-CORE-046
- SwRS-MDOKFSTUDIO-CORE-048
- SwRS-MDOKFSTUDIO-CORE-049
- SwRS-MDOKFSTUDIO-CORE-050
- SwRS-MDOKFSTUDIO-CORE-051
- SwRS-MDOKFSTUDIO-CORE-052
- SwRS-MDOKFSTUDIO-CORE-053
- SwRS-MDOKFSTUDIO-CORE-065
- SwRS-MDOKFSTUDIO-CORE-066
- SwRS-MDOKFSTUDIO-CORE-068
- SwRS-MDOKFSTUDIO-CORE-070
- SwRS-MDOKFSTUDIO-CORE-071
- SwRS-MDOKFSTUDIO-CORE-072
- SwRS-MDOKFSTUDIO-CORE-073
- SwRS-MDOKFSTUDIO-CORE-074
- SwRS-MDOKFSTUDIO-CORE-075
- SwRS-MDOKFSTUDIO-GFM-029
- SwRS-MDOKFSTUDIO-LIFE-094
- SwRS-MDOKFSTUDIO-TRUST-052
default_owner_email: gaetan@xeberon.net
---

## A reader reads a faithful rendering of any document

### Normative behavior

When a writer opens or edits a Markdown file, the Studio SHALL show a rendered preview of its content beside the editor that follows each edit and displays text in any script and direction readably inside the preview column.

### Preserved stakeholder intent

Writers need to read their Markdown as formatted text, at any length, while they type, and to read documents in any script and direction without horizontal scrolling.

### Rationale and constraints

- Covers headings, lists, quotes, inline code, images and long documents. The rendering is the same in every palette mode.
- Covers Japanese, Chinese, Korean, Hebrew and Arabic text and long unbreakable words such as long URLs, which wrap inside the preview column instead of scrolling sideways.
