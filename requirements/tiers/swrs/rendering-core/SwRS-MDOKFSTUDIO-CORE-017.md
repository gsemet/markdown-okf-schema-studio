---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-017
uuid: 1d56421c-531a-4fed-9f4e-29476d62668a
title: Read a repeated include once per render
description: When one file is included several times in a render, the extension
  SHALL read and parse it once and keep each use's own include line.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Read a repeated include once per render

### Normative behavior

When one file is included several times in a render, the extension SHALL read and parse it once and keep each use's own include line.

### Scenario: Nominal read a repeated include once per render

- GIVEN a file included three times
- WHEN it is rendered
- THEN the file is read once

### Scenario: Boundary or refusal of read a repeated include once per render

- GIVEN the three include directives sit on different lines
- WHEN it is rendered
- THEN each copy maps to its own directive line

### Verification notes

- Method: test
- Criteria: A single read per render and distinct lines per use.
