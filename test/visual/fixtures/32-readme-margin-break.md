# Release readiness

The reading column stays narrow, so prose is comfortable to read. A table or a figure that needs
more room leaves the column, takes the width it needs, and stays centred on the page.

| Service | Owner | Build | Tests | Coverage | Latency p95 | Error budget | Next release | Reviewer | Ticket | Rollback | Pager |
|---|---|---|---|---|---|---|---|---|---|---|---|
| gateway | platform | 1.42.0 | passing | 91 % | 118 ms | 82 % left | Tuesday | ana | OPS-1042 | automatic | ana |
| scheduler | fleet | 2.7.3 | passing | 88 % | 64 ms | 95 % left | Thursday | bo | OPS-1051 | automatic | bo |
| telemetry | data | 0.19.1 | flaky | 76 % | 203 ms | 41 % left | blocked | chen | OPS-1063 | manual | chen |

Prose goes back to the column right after the table, so the break-out never pushes the text around.

```{figure} ../external-img/fleet-loop.svg
:width: 1100px
:alt: Fleet operating loop

Fleet operating loop, drawn wider than the reading column.
```
