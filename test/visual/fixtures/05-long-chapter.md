# Operating the fleet

:::{note}
This chapter assumes you have read the depot topology handbook.
It repeats none of it.
:::

Fleet operations is the discipline of keeping vehicles, drivers and legs
aligned when any one of the three is unavailable. The platform does not solve
that problem; it makes the mismatch visible early enough to be fixed by hand.

```{figure} ../external-img/fleet-loop.svg
:name: fig-fleet-loop
:width: 720px

The operating loop: plan, dispatch, observe, correct. Each pass through the
loop consumes the previous pass's corrections {cite}`okoye2019`.
```

## The four states of a leg

A leg is always in exactly one of four states, and the transitions between
them are the entire contract between the planner and the tracker.

- **planned** — emitted by the planner, no vehicle assigned,
- **assigned** — a vehicle and driver are bound to the leg,
- **in transit** — the parcel has been scanned onto the vehicle,
- **completed** — the destination depot has scanned it off.

:::{important}
There is no *cancelled* state. A leg that will never complete stays
**assigned** forever, and the only way to clear it is a manual write to the
regional store. This is the single largest source of stale dashboard data.
:::

The paragraph after that important block is ordinary body text and must look
exactly like the paragraphs above it.

### Why there is no cancelled state

The original design had one. It was removed after an incident in which a
partial network split caused two regions to disagree about whether a leg had
been cancelled, and parcels were physically loaded onto vehicles that the
platform believed were empty {cite}`kessler2021`.

> The safest state machine is the one with the fewest edges you can reach by
> accident. We removed the edge rather than defend it.

:::{danger}
Do not add a cancelled state back without a distributed agreement mechanism.
The incident review is explicit on this point, and the depot contract encodes
the four-state machine in its schema validation.
:::

## Shift changes

Shift changes are the busiest sixty seconds in the system. Every depot
simultaneously re-reports vehicle availability, and the planners all refresh
their rolling windows at once.

1. Outgoing shift scans off remaining parcels.
2. Depot reports vehicle availability.
3. Planner refreshes the rolling window.
4. Incoming shift scans on.

:::{warning} Do not drain during a shift change
Intake keeps accepting manifests for up to ninety seconds after a drain begins,
and those manifests are dropped without a trace in the audit log.
:::

```bash
northwind depot drain nw-07 --wait-for-quiet
northwind depot status nw-07 --watch
```

### Capacity arithmetic

Available bay-hours for a depot over a shift:

$$
H = b \times s \times \left(1 - \frac{m}{60}\right)
$$

where $b$ is bays, $s$ is shift length in hours, and $m$ the maintenance
minutes booked for that shift.

## Observability

The tracker is the only component with a complete view of leg state, which
makes it both the most useful and the most dangerous service to query.

| Signal              | Source   | Retention | Cardinality |
|---------------------|----------|-----------|-------------|
| leg state changes   | tracker  | 90 days   | high        |
| planner decisions   | planner  | 14 days   | very high   |
| intake acceptance   | intake   | 400 days  | low         |
| arbiter elections   | arbiter  | 400 days  | very low    |

:::{caution}
Planner decision logs are sampled at one percent in regions with more than
ten depots. Any query that assumes completeness will be wrong by two orders
of magnitude, and nothing in the query interface warns you.
:::

:::{tip}
Arbiter election logs are tiny and kept for over a year. They are almost always
the right place to start when reconstructing an incident timeline.
:::

## Incident patterns

Three patterns account for most of the pages.

### Stale rolling window

A planner restarts, loses six hours of history, and starts emitting optimistic
transit estimates. Nothing fails; legs simply start missing their deadlines by
a consistent margin.

:::{hint}
Compare the planner's estimate distribution before and after the restart.
A step change in the median with no change in the tail is this pattern.
:::

### Split arbiter

Two planners each believe they are leader and emit conflicting legs for the
same parcel {cite}`vartanen2023`. The tracker accepts both, and the parcel
appears in two places at once.

:::{danger}
Recovery is manual and takes roughly four hours. Never restart both regional
arbiters at once; that is the only reliable way to cause this.
:::

### Graph drift

The depot graph is migrated forward while an older planner is still running.
The older planner cannot parse the new edge format and falls back to a
cached graph that may be days old.

:::{seealso}
The deployment chapter covers the one-release backward compatibility rule
that exists specifically to prevent this.
:::

## Runbook summary

- Check arbiter elections first; they are cheap and long-lived.
- Compare planner estimate distributions across the suspected restart.
- Replay yesterday's manifests against today's graph to separate graph
  problems from planner problems.
- Escalate to the regional operations desk before writing to the store by hand.

:::{note}
Manual writes to the regional store are logged and reviewed weekly.
That review has never found a write that was unnecessary, which is either
reassuring or a sign that nobody is looking hard enough.
:::

The final paragraph of this chapter exists so that a bottom-of-page screenshot
shows recognisable text rather than trailing whitespace. If you can read this
line in a screenshot, the scroll reached the true end of the document.
