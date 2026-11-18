---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-092
uuid: b8fd024d-acb2-4960-9736-b7c5ac40849a
title: The package keeps the built-in engine bundle in the VSIX
description: 'The package SHALL keep the folder out/bundle, which holds the built-in
  engine bundle and its licence, in the VSIX and exclude only build leftovers.'
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/plantumlBundle.markers.ts
tested_in_files:
- test/security/package-contract.test.ts
default_owner_email: gaetan@xeberon.net
---

## The package keeps the built-in engine bundle in the VSIX

### Normative behavior

The package SHALL keep the folder out/bundle, which holds the built-in engine bundle and its licence, in the VSIX and exclude only build leftovers.

### Scenario (nominal): Bundle folder kept

- GIVEN the .vscodeignore file
- WHEN its lines are read
- THEN no line excludes out/bundle or out/**

### Scenario (nominal): Engine bundle and licence

- GIVEN the build script esbuild.mjs
- WHEN it is read
- THEN an esbuild entry point builds out/bundle/plantumlPreview.js from src/page/modules/plantumlPreview.ts, and the engine LICENSE is copied to out/bundle/plantuml/LICENSE

### Scenario (nominal): Leftovers excluded

- GIVEN the .vscodeignore file
- WHEN its lines are read
- THEN it lists **/*.map, .claude/**, pyproject.toml and docs/*.md, and no line excludes the whole docs folder

### Scenario (refusal): Contract broken

| Input | Outcome |
| --- | --- |
| a .vscodeignore with the line out/** | the package contract test fails |
| a .vscodeignore without the line **/*.map | the package contract test fails |

### Verification notes

- Method: Unit test test/security/package-contract.test.ts (the VSIX leaves out source maps, internal docs, agent files and the Python project file; the built-in PlantUML engine ships pinned and the JAR is an explicit opt-in setting) covers the .vscodeignore lines and the bundle entry point of esbuild.mjs. The other bundles (preview.js, preview.css, KaTeX, Mermaid) are not asserted.
- Criteria: .vscodeignore does not exclude out/bundle or out/**, the build script holds the entry point of out/bundle/plantumlPreview.js and the licence copy (no test asserts the licence copy), and the leftovers are excluded.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-014](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-014.md): The extension is built from pinned dependencies and ships what it loads
<!-- okf:links:end -->
