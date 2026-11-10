---
title: Quarterly export plan
status: draft
tags: [export, csv, nightly]
owner:
  name: Ada
  team: core
---

# `= this.title`

The plan is `= this.status`, tagged `= this.tags`, and owned by `=this.owner.name`.

Every field of the document is read the same way: the team is `= this.owner.team`, and the whole
owner reads `= this.owner`.

The reviewer is `= this.reviewer`: the front matter has no such field, so the code stays as written
with a warning style.

```text
= this.title
```
