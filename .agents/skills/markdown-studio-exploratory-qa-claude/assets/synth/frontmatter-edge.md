---
# Leading comment that must survive edits
type: edge
title: Brake release detection # trailing comment
summary: >-
  A folded summary that spans two source lines
  and must stay folded after unrelated edits.
notes: |
  Line one of a literal block.
  Line two keeps its break.
status: review
priority: 3
published: false
reviewed_on: 2026-09-28
tags: [braking, safety, "with: colon"]
related:
- related-target
- missing-target
owner:
  name: Ada
  team: Chassis
custom_key: kept because additionalProperties is true
---

# Frontmatter edge cases

Edit one field at a time from the properties table, then diff the buffer against this file.
Only the edited field's lines may change.

Body paragraph that must stay untouched.
