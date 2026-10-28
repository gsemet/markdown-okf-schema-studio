---
type: StRS
id: StRS-MDOKFSTUDIO-TOOLBAR-011
uuid: ec095283-a874-4d71-9759-e51e62e091f0
title: Links open the right target, show where they lead, or are refused with a
  reason
description: When a reader clicks a link in the preview, the Studio SHALL open
  its target, or refuse it with a reason, show in the tooltip of a link that
  comes into view the file it leads to or the reason it cannot be followed, and
  never open a file outside the workspace unless the reader enabled the
  frontmatter outside-link setting.
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I click a link and land on the right document, line,
  heading or web page; when a link cannot be followed I am told why, I rest the
  pointer on a link and read where it goes or why it is broken before I click,
  and a link cannot take me to a file outside my workspace unless I turned on
  the setting that allows outside links for frontmatter links.
derived_by:
- SwRS-MDOKFSTUDIO-TOOLBAR-077
- SwRS-MDOKFSTUDIO-TOOLBAR-079
- SwRS-MDOKFSTUDIO-TOOLBAR-083
- SwRS-MDOKFSTUDIO-TOOLBAR-085
- SwRS-MDOKFSTUDIO-TOOLBAR-090
- SwRS-MDOKFSTUDIO-TOOLBAR-094
- SwRS-MDOKFSTUDIO-TOOLBAR-098
- SwRS-MDOKFSTUDIO-TOOLBAR-102
- SwRS-MDOKFSTUDIO-TOOLBAR-113
- SwRS-MDOKFSTUDIO-TOOLBAR-117
- SwRS-MDOKFSTUDIO-TRUST-006
- SwRS-MDOKFSTUDIO-TRUST-007
- SwRS-MDOKFSTUDIO-TRUST-063
- SwRS-MDOKFSTUDIO-TRUST-065
default_owner_email: gaetan@xeberon.net
---

## Links open the right target, show where they lead, or are refused with a reason

### Normative behavior

When a reader clicks a link in the preview, the Studio SHALL open its target, or refuse it with a reason, show in the tooltip of a link that comes into view the file it leads to or the reason it cannot be followed, and never open a file outside the workspace unless the reader enabled the frontmatter outside-link setting.

### Preserved stakeholder intent

As a reader, I click a link and land on the right document, line, heading or web page; when a link cannot be followed I am told why, I rest the pointer on a link and read where it goes before I click, and a small warning icon next to a link tells me before I click that its target is missing or blocked, and a link cannot take me to a file outside my workspace unless I turned on the setting that allows outside links for frontmatter links.

### Rationale and constraints

- Targets: a heading, a block id, a line, a label or a slug of a Markdown file; an external address is handed to the system.
- A wikilink is found by its file name in every workspace folder; an ambiguous name is refused.
- In a standalone (read-only) preview, the folder of the document replaces the workspace.
- Only links that scroll into view are checked, so a long document is not resolved all at once.
- The hint never changes where the link goes.
- Hints already known survive an in-place update of the content.
- A link to a missing or blocked target keeps its text and colour; a small warning icon follows it and its tooltip names the problem.
