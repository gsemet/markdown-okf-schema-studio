---
type: SwRS
id: SwRS-MDOKFSTUDIO-THEME-024
uuid: 65c2d471-addd-4055-beb5-f3b1360b1f1b
title: A theme switch starts no colour transition under reduced motion
description: When the system prefers reduced motion and the reader presses the
  Theme button, the extension SHALL change the colours without marking the page
  as switching.
project: markdown-okf-schema-studio
scope: theme-zoom
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-THEME-002
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A theme switch starts no colour transition under reduced motion

### Normative behavior

When the system prefers reduced motion and the reader presses the Theme button, the extension SHALL change the colours without marking the page as switching.

### Scenario: Reduced motion

- GIVEN a system that prefers reduced motion
- WHEN the reader switches the theme
- THEN the attribute data-sphinx-preview-theme-switching is never set and no fallback timer is started

### Scenario: Normal motion

- GIVEN a system without that preference
- WHEN the reader switches the theme
- THEN the page is marked as switching until the body background has changed, or for 400 ms when two modes share a background (see SwRS-MDOKFSTUDIO-CORE-053 for the transition itself)

### Verification notes

- Method: Unit test `CR 046: with prefers-reduced-motion: reduce nothing is marked to move` (test/page/modules/motion.test.ts) calls themeSwitch with reduced motion on and asserts no marker and no timer; the normal case is `CR 046: a theme switch transitions the colours once, until the body background has changed`.
- Criteria: No marker and no timer under reduced motion; the marker and one timer otherwise.
