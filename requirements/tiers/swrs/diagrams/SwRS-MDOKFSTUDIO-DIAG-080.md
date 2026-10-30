---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-080
uuid: 1b519d47-9394-4d6d-8128-681e87e79d86
title: The built-in engine bundle and licence are packaged
description: When the extension is built, it SHALL produce
  out/bundle/plantumlPreview.js from src/page/modules/plantumlPreview.ts and
  copy the engine's LICENSE to out/bundle/plantuml/LICENSE.
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-TRUST-074; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-TRUST-074
default_owner_email: gaetan@xeberon.net
---

## The built-in engine bundle and licence are packaged

### Normative behavior

When the extension is built, it SHALL produce out/bundle/plantumlPreview.js from src/page/modules/plantumlPreview.ts and copy the engine's LICENSE to out/bundle/plantuml/LICENSE.

### Scenario: Bundle

- GIVEN the build script
- WHEN it is read
- THEN an esbuild entry point builds the bundle file from the preview module

### Scenario: Licence

- GIVEN the build script
- WHEN it is read
- THEN the engine LICENSE is copied next to the bundle

### Verification notes

- Method: Unit test on the package contract and esbuild.mjs.
- Criteria: Bundle entry and licence copy are present.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-006](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-006.md): A writer reads PlantUML diagrams without any setup
- Superseded by:
  - [SwRS-MDOKFSTUDIO-TRUST-074](../trust-security/SwRS-MDOKFSTUDIO-TRUST-074.md): The package ships its icon and its bundle
<!-- okf:links:end -->
