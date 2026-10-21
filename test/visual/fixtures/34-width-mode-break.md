# Width mode break

Prose stays in the reading column. A table, a code block and a figure wider than the column leave it
in Auto, and use the whole pane in Full width.

| Column 1 heading | Column 2 heading | Column 3 heading | Column 4 heading | Column 5 heading | Column 6 heading | Column 7 heading | Column 8 heading | Column 9 heading | Column 10 heading | Column 11 heading | Column 12 heading |
|---|---|---|---|---|---|---|---|---|---|---|---|
| row1-column-1-value | row1-column-2-value | row1-column-3-value | row1-column-4-value | row1-column-5-value | row1-column-6-value | row1-column-7-value | row1-column-8-value | row1-column-9-value | row1-column-10-value | row1-column-11-value | row1-column-12-value |
| row2-column-1-value | row2-column-2-value | row2-column-3-value | row2-column-4-value | row2-column-5-value | row2-column-6-value | row2-column-7-value | row2-column-8-value | row2-column-9-value | row2-column-10-value | row2-column-11-value | row2-column-12-value |
| row3-column-1-value | row3-column-2-value | row3-column-3-value | row3-column-4-value | row3-column-5-value | row3-column-6-value | row3-column-7-value | row3-column-8-value | row3-column-9-value | row3-column-10-value | row3-column-11-value | row3-column-12-value |

Text after the table.

```python
def plan_release(services, window, reviewers, rollback_policy, error_budget, notify_channels, dry_run=False):
    return [service for service in services if service.ready and service.owner in reviewers and not dry_run]
```

```{figure} ../external-img/fleet-loop.svg
:width: 1100px
:alt: Fleet operating loop

Fleet operating loop, wider than the column.
```

A closing paragraph, back in the column.
