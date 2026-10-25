---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-074
uuid: b9bcebca-dbe5-426b-9fef-251b9e3ed9ea
title: The package ships its icon and its bundle
description: The package SHALL declare images/logo.png, a PNG of 256 by 256
  pixels, as its extension icon and keep the folder out/bundle, which holds the
  built-in engine bundle and its licence, in the VSIX.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-012
- StRS-MDOKFSTUDIO-TRUST-014
- StRS-MDOKFSTUDIO-DIAG-006
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/plantumlBundle.markers.ts
tested_in_files:
- test/security/package-contract.test.ts
---

## The package ships its icon and its bundle

### Normative behavior

The package SHALL declare images/logo.png, a PNG of 256 by 256 pixels, as its extension icon and keep the folder out/bundle, which holds the built-in engine bundle and its licence, in the VSIX.

### Scenario (nominal): Icon

- GIVEN the icon key of the manifest
- WHEN it is read
- THEN it is images/logo.png

### Scenario (nominal): Icon file

- GIVEN the file images/logo.png
- WHEN its header is read
- THEN it has the PNG signature and the width and height fields are both 256

### Scenario (nominal): Bundle folder kept

- GIVEN the .vscodeignore file
- WHEN its lines are read
- THEN no line excludes out/bundle or out/**

### Scenario (nominal): Engine bundle and licence

- GIVEN the build script esbuild.mjs
- WHEN it is read
- THEN an esbuild entry point builds out/bundle/plantumlPreview.js from src/page/modules/plantumlPreview.ts, and the engine LICENSE is copied to out/bundle/plantuml/LICENSE

### Scenario (refusal): Contract broken

| Input | Outcome |
| --- | --- |
| a manifest whose icon key names another file | the package contract test fails |
| an icon file that is not a 256 by 256 PNG | the package contract test fails |
| a .vscodeignore with the line out/** | the package contract test fails |

### Verification notes

- Method: Unit test test/security/package-contract.test.ts (extension icon is a 256 pixel PNG and the Sphinx favicon matches the shared logo; the built-in PlantUML engine ships pinned and the JAR is an explicit opt-in setting) covers the icon key, the icon file, the .vscodeignore lines and the bundle entry point of esbuild.mjs. The same tests also compare the favicon file of the Sphinx fixtures with images/logo.svg; that is not product behaviour and is not specified. The other bundles (preview.js, preview.css, KaTeX, Mermaid) are not asserted.
- Criteria: The icon key equals images/logo.png and the width and height fields of the PNG header are both 256. Without the bundle the preview page loads no runtime from the VSIX; the bundle entry and the licence copy are present in the build script (esbuild.mjs); no test asserts the licence copy.
