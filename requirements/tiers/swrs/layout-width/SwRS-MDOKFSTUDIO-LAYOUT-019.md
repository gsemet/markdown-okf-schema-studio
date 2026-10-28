---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-019
uuid: 608fcea7-9c37-4c23-ba21-a25c080681f6
title: Bursts of clearance updates are limited
description: When more than 200 clearance updates occur within one second, the
  extension SHALL limit them by skipping the excess and measuring the last
  change in one trailing update.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-004
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-018; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-LAYOUT-018
default_owner_email: gaetan@xeberon.net
---

## Bursts of clearance updates are limited

### Normative behavior

When more than 200 clearance updates occur within one second, the extension SHALL limit them by skipping the excess and measuring the last change in one trailing update.

### Scenario: Burst of resizes

- GIVEN 205 resize events in one second followed by a layout change and two more resizes
- WHEN the events are handled
- THEN the change is not measured by the skipped updates and exactly one trailing timer is scheduled

### Scenario: Trailing update

- GIVEN the second has ended
- WHEN the trailing timer runs
- THEN the last change is measured and published (inset 192 px in the tested layout)

### Known issues

- Known issue: After a change the layout is also measured on every animation frame until it has been unchanged for 60 frames, with a limit of 300 frames; only the burst limiter is tested.

### Verification notes

- Method: Unit test a change inside a burst of skipped updates is measured by one trailing update.
- Criteria: Exactly one timer is pending after the burst and the final measurement is published after it fires.
