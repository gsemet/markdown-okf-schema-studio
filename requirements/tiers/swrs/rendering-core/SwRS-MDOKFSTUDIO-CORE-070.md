---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-070
uuid: 286ca83a-9254-4659-83d8-a75f973da50b
title: A parse splits the source into lines once, whatever the number of
  directives
description: When a document is parsed, the MyST parser SHALL split the source
  text into lines once per parse and reuse the lines for every directive fence,
  so that the parse time does not grow with the number of directives times the
  size of the document, and the tightness of each directive (blank lines before
  and after it) SHALL stay unchanged.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystTightness.markers.ts
tested_in_files:
- test/build/mystSourcePatches.test.ts
---

## A parse splits the source into lines once, whatever the number of directives

### Normative behavior

When a document is parsed, the MyST parser SHALL split the source text into lines once per parse and reuse the lines for every directive fence, so that the parse time does not grow with the number of directives times the size of the document, and the tightness of each directive (blank lines before and after it) SHALL stay unchanged.

### Scenario (nominal): One split for a document with several directives

- GIVEN a document with five directive fences, some with a blank line before, after, both or neither
- WHEN it is parsed with markdown-it-myst patched in memory (the esbuild bundle plugin, or the Node load hook of Node-run code)
- THEN the source is split into lines once, and each directive reports the same tightness as the unpatched package: false, "before", "after" or true

### Scenario (boundary): The packages on disk stay untouched

- GIVEN an install of the pristine MyST packages
- WHEN the bundle is built or Node-run code parses a document
- THEN the patches are applied to the source in memory, no file of node_modules is written, and the install has no postinstall script

### Scenario (refusal): An unknown package version

- GIVEN a markdown-it-myst version other than 1.0.18, or a file that does not match the expected code
- WHEN the bundle is built or the package is loaded
- THEN it fails with a message asking for a review of the patch, instead of patching blindly

### Known issues

- Known issue: the in-memory patch (scripts/myst-patches.mjs) is needed until the upstream package splits the source once per parse;
  the pull request text is prepared and not yet sent.

### Verification notes

- Method: Unit tests in test/build/mystSourcePatches.test.ts build a scratch install under os.tmpdir() with pristine copies of the three patched packages, bundle a probe with the esbuild plugin and run it with the Node load hook, then count the line splits of a parse; a changed version or content must fail the build.
- Criteria: Without the plugin the package splits the source once per directive fence (5) and cannot resolve markdown-it/lib/common/utils.js; with it the source is split once, the tightness values are identical, the imports resolve to utils.mjs, and neither the scratch copy nor the real node_modules is written. The parse time at 55k lines (bench-render.mjs) fell from 2.5 s to 0.46 s.
