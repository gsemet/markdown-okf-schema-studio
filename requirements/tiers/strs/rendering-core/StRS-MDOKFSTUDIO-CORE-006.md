---
type: StRS
id: StRS-MDOKFSTUDIO-CORE-006
uuid: 79f65903-9430-474a-8a73-332dc848da17
title: An agent writes Markdown for Studio with the shipped writing skill
description: Where the writer installs the Studio plugin in an agent host, the
  Studio SHALL ship a writing skill that lets the agent write Markdown the
  Studio renders without error.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: A writer working with a coding agent needs the agent to write cards,
  tabs, admonitions, charts and diagrams that Studio renders without error.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-073
- SwRS-MDOKFSTUDIO-CORE-074
default_owner_email: gaetan@xeberon.net
---

## An agent writes Markdown for Studio with the shipped writing skill

### Normative behavior

Where the writer installs the Studio plugin in an agent host, the Studio SHALL ship a writing skill that lets the agent write Markdown the Studio renders without error.

### Preserved stakeholder intent

A writer working with a coding agent installs the Studio plugin in the agent host, and the agent writes cards, tabs, admonitions, charts and diagrams that Studio renders without error.

### Rationale and constraints

- The skill is one folder, shared by every agent host through its plugin manifest; no copy exists.
- The skill is self-contained and its examples are checked by the preview pipeline.
- The plugin manifests stay out of the extension package.

### Main paths

#### Path 1: Install the skill and write Markdown

1. The writer installs the Studio plugin in an agent host
   - SwRS-MDOKFSTUDIO-CORE-074: the plugin and the marketplaces resolve to the one skill folder
2. The agent reads the writing skill
   - SwRS-MDOKFSTUDIO-CORE-073: every example of the skill renders without error
3. The agent writes Markdown that Studio renders

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-CORE-073](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-073.md): The writing skill's examples render without error
  - [SwRS-MDOKFSTUDIO-CORE-074](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-074.md): The writing skill is packaged as an installable agent plugin
<!-- okf:links:end -->
