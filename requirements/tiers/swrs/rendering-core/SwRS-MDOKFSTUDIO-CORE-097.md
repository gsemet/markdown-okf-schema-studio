---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-097
uuid: 2bfb640d-eebd-4869-bf13-d8f40346d2d7
title: The marker check refuses a marker that names no declared scenario or sits
  on the wrong bench
description: 'When a maintainer runs the marker check, it SHALL read the scenarios
  of every requirement and fail, naming the file, the line, the rule and the marker,
  on a marker whose #S<n> fragment names a scenario its target does not declare, on
  a marker without a fragment on a target that declares scenarios, on a fragment on
  a target that declares none, on an @accepts_req outside test/integration/ (except
  for the StRS of the release, the site and the built VSIX) or on a SwRS, and on a
  @tests_req StRS marker under test/integration/ that is not on the baseline.'
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-007
scenarios:
- id: S1
  title: Every marker names a declared scenario
- id: S2
  title: A fragment names an undeclared scenario
- id: S3
  title: A fragment is missing or unexpected
- id: S4
  title: An acceptance marker sits on the wrong bench
- id: S5
  title: An acceptance marker targets a SwRS
- id: S6
  title: A StRS tested in real VS Code
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- scripts/check-marker-companions.mjs
tested_in_files:
- test/build/checkMarkers.test.ts
default_owner_email: gaetan@xeberon.net
---

## The marker check refuses a marker that names no declared scenario or sits on the wrong bench

### Normative behavior

When a maintainer runs the marker check, it SHALL read the scenarios of every requirement and fail, naming the file, the line, the rule and the marker, on a marker whose #S<n> fragment names a scenario its target does not declare, on a marker without a fragment on a target that declares scenarios, on a fragment on a target that declares none, on an @accepts_req outside test/integration/ (except for the StRS of the release, the site and the built VSIX) or on a SwRS, and on a @tests_req StRS marker under test/integration/ that is not on the baseline.

### Scenario (nominal): Every marker names a declared scenario

- GIVEN a requirement that declares scenarios S1 and S2, a requirement that declares none, and markers `@tests_req <ID>#S1`, `@tests_req <ID>#S2` and `@tests_req <ID>` placed by these rules
- WHEN the maintainer runs the marker check
- THEN it passes, and two fragments of one ID count as one ID in a marker block

### Scenario (refusal): A fragment names an undeclared scenario

- GIVEN a requirement that declares S1 and S2 and a marker `@tests_req <ID>#S3` (or `#S0`)
- WHEN the maintainer runs the marker check
- THEN it fails with `<path>:<line>: fragment-undeclared: @tests_req <ID>#S3` and the declared ids

### Scenario (refusal): A fragment is missing or unexpected

- GIVEN a marker without a fragment on a requirement that declares scenarios, and a marker with a fragment on a requirement that declares none
- WHEN the maintainer runs the marker check
- THEN it fails with `fragment-required` on the first and `fragment-unexpected` on the second, each naming the file, the line and the marker

### Scenario (refusal): An acceptance marker sits on the wrong bench

- GIVEN an `@accepts_req <StRS-ID>#S<n>` in a file outside `test/integration/`, for a StRS other than CORE-007, CORE-008 and TRUST-014
- WHEN the maintainer runs the marker check
- THEN it fails with `accepts-placement`, while the same marker under `test/integration/`, and a marker of those three StRS under `test/build`, `test/security`, `test/site` or `test/core`, pass

### Scenario (refusal): An acceptance marker targets a SwRS

- GIVEN an `@accepts_req <SwRS-ID>` in any test file
- WHEN the maintainer runs the marker check
- THEN it fails with `accepts-on-swrs`

### Scenario (boundary): A StRS tested in real VS Code

- GIVEN a `@tests_req <StRS-ID>#S<n>` under `test/integration/`
- WHEN the maintainer runs the marker check
- THEN it fails with `strs-tests-in-integration` unless the file is listed in the `strsTestsInIntegration` baseline at that count, and a listed file that shrinks or gets clean must be lowered or removed

### Verification notes

- Method: Unit tests in test/build/checkMarkers.test.ts, one per rule, each run on a scratch git repository; the shipped bundle through `just check-markers`.
- Criteria: Each failure prints `<path>:<line>: <rule>: <marker>` and the exit code is 1; the shipped bundle passes.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-007](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-007.md): A maintainer ships a version only after green checks and reviewed release notes
<!-- okf:links:end -->
