---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-074
uuid: 1ac757a9-5c21-4fd4-ba10-325a93a0f5ed
title: The writing skill is packaged as an installable agent plugin
description: When the repository is checked, the packaging SHALL provide a
  Claude Code plugin and marketplace, an Agent Plugins 1.0.0 plugin.json valid
  against its published JSON Schema, a Codex marketplace and a GitHub Copilot
  marketplace catalog, all resolving to the single writing skill folder with no
  copy, and SHALL keep the manifests out of the VSIX.
project: MDOKFSTUDIO
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- skills/writing-for-markdown-okf-schema-studio/SKILL.md
tested_in_files:
- test/build/test_plugin_manifests.py
default_owner_email: gaetan@xeberon.net
---

## The writing skill is packaged as an installable agent plugin

### Normative behavior

When the repository is checked, the packaging SHALL provide a Claude Code plugin and marketplace, an Agent Plugins 1.0.0 plugin.json valid against its published JSON Schema, a Codex marketplace and a GitHub Copilot marketplace catalog, all resolving to the single writing skill folder with no copy, and SHALL keep the manifests out of the VSIX.

### Scenario (nominal): One skill tree for every host

- GIVEN the repository root with `plugin.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json` and `.github/plugin/marketplace.json`
- WHEN the manifests are read
- THEN they all name the plugin `markdown-okf-schema-studio`, the Claude Code and GitHub Copilot marketplaces are both named `markdown-okf-schema-studio`, the marketplaces point at the repository root, no manifest redirects the skill location, `plugin.json` validates against the pinned Agent Plugins 1.0.0 JSON Schema, and exactly one `skills/writing-for-markdown-okf-schema-studio/SKILL.md` exists

### Scenario (boundary): Refusals

| Input | Outcome |
| --- | --- |
| `plugin.json` carries a key the Agent Plugins schema does not define | the schema check fails |
| the Copilot catalog lacks `name`, `owner.name` or a plugin `name` or `source`, has a name that is not kebab-case or longer than 64 characters, a plugin description longer than 1024 characters, or a `$schema` key | the check fails (Copilot CLI `marketplace.json` reference) |
| a second `SKILL.md` of the writing skill exists in the repository | the check fails (no copy) |
| `.vscodeignore` does not exclude `plugin.json`, `.claude-plugin/**` or `.agents/**` | the check fails (the VSIX would ship them) |

### Verification notes

- Method: test/build/test_plugin_manifests.py validates the manifests against the pinned schema in test/fixtures/agent-plugins/ and the Copilot catalog against the fields of the Copilot CLI plugin reference; `claude plugin validate . --strict` checks the Claude Code plugin and marketplace.
- Criteria: The schema validates, the names and paths agree, one skill tree exists, and the VSIX excludes the manifests.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
<!-- okf:links:end -->
