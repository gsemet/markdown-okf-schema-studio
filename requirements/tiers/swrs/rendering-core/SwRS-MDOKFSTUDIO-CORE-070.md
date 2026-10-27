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
- test/build/mystTightnessPatch.test.ts
---

## A parse splits the source into lines once, whatever the number of directives

### Normative behavior

When a document is parsed, the MyST parser SHALL split the source text into lines once per parse and reuse the lines for every directive fence, so that the parse time does not grow with the number of directives times the size of the document, and the tightness of each directive (blank lines before and after it) SHALL stay unchanged.

### Scenario (nominal): One split for a document with several directives

- GIVEN a document with five directive fences, some with a blank line before, after, both or neither
- WHEN it is parsed after the install step has patched markdown-it-myst
- THEN the source is split into lines once, and each directive reports the same tightness as the unpatched package: false, "before", "after" or true

### Scenario (boundary): The patch runs twice

- GIVEN an install that is already patched
- WHEN the install step runs again
- THEN it changes nothing and the parse still splits the source once

### Scenario (refusal): An unknown package version

- GIVEN a markdown-it-myst version other than 1.0.18, or a file that does not match the expected code
- WHEN the install step runs
- THEN it fails with a message asking for a review of the patch, instead of patching blindly

### Known issues

- Known issue: the patch is needed until the upstream package splits the source once per parse;
  the pull request text is prepared and not yet sent.

### Verification notes

- Method: Unit test "the myst patch splits the source into lines once per parse and keeps the tightness values" in test/build/mystTightnessPatch.test.ts, which runs the patch script on a scratch copy of the three patched packages and counts the line splits of a parse before and after.
- Criteria: The unpatched copy splits the source once per directive fence (5); the patched copy splits it once; the tightness values are identical and a second run of the patch changes nothing. The parse time at 55k lines (bench-render.mjs) fell from 2.5 s to 0.46 s.
