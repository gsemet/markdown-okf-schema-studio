# Northwind Freight Platform Handbook

The routing platform moves parcels between twenty-two regional depots.
This handbook describes the pieces a new engineer has to understand before
touching the dispatch path, and the rules that keep the fleet predictable.

:::{note}
Everything in this chapter assumes the *staging* topology.
Production adds a second arbiter and a read-only replica per region.
:::

The dispatch path is the only component with a hard latency budget.
Everything downstream of it is allowed to be eventually consistent,
which is why the storage chapter reads so differently from this one.

:::{admonition} Terminology drift
:class: tips

Between 2019 and 2022 the same component was called *router*, *dispatcher*,
and *allocator* in three different documents.
The code says `allocator`. The dashboards say **dispatcher**.
Assume they mean the same thing unless a diagram says otherwise.
:::

## Depot topology

Each depot exposes three services and nothing else:

- an **intake** endpoint that accepts parcel manifests,
- a **planner** that turns a manifest into a sequence of legs,
- a **tracker** that reports leg completion back to the region.

The planner is the only stateful service. It keeps a rolling window of the last
six hours of completed legs so it can estimate transit times without a round
trip to the regional store.

:::{important}
A planner that loses its rolling window will still answer requests.
It will answer them badly, with fallback estimates that are roughly
forty percent too optimistic, and nothing in the health check will notice.
:::

Right after an important admonition, this paragraph must render in the
ordinary body colour. If it looks muted or tinted, the admonition is leaking
its own styling into the surrounding flow.

### Leg planning

A *leg* is a single depot-to-depot hop. The planner emits legs greedily and
never revises a leg once a parcel has been scanned onto a vehicle.

1. Read the manifest and resolve the destination postcode to a region.
2. Ask the regional store for the current depot graph.
3. Run a bounded Dijkstra with a hop limit of four.
4. Emit the legs, oldest deadline first.
5. Persist the plan and acknowledge the manifest.

```python
def plan_legs(manifest: Manifest, graph: DepotGraph) -> list[Leg]:
    """Return the ordered legs for one manifest.

    Raises UnroutableError when no path exists within the hop limit.
    """
    region = resolve_region(manifest.destination_postcode)
    path = bounded_dijkstra(graph, manifest.origin, region, max_hops=4)
    if path is None:
        raise UnroutableError(manifest.id, manifest.destination_postcode)
    return [
        Leg(parcel=manifest.id, origin=a, destination=b, deadline=manifest.deadline)
        for a, b in pairwise(path)
    ]
```

:::{warning} Hop limit is not a tuning knob
The hop limit of four is baked into the depot contract.
Raising it makes the planner emit routes that no vehicle schedule can serve,
and the tracker will report those legs as permanently pending.
:::

## Service level targets

| Service | p50 | p99 | Error budget | Owner | Region | Shift | Queue | Replica | Audit |
|---------|-----|-----|--------------|-------|--------|-------|-------|---------|-------|
| intake | 12 ms | 80 ms | 0.1% | Platform | North | Night | Primary | Standby | Complete |
| planner | 40 ms | 250 ms | 0.5% | Routing | East | Day | Secondary | Active | Complete |
| tracker | 8 ms | 45 ms | 1.0% | Observability | South | Night | Primary | Standby | Pending |
| archive | 900 ms | 4 s | 5.0% | Storage | West | Day | Secondary | Active | Complete |

The error budget is measured over a rolling thirty-day window.
Burning more than half of it in a week freezes deploys for that service
until the following Monday.

:::{tip}
The freeze is advisory for `archive` and enforced for `intake`.
Nobody has ever successfully argued their way around the `intake` freeze.
:::

### Measuring the budget

The budget is a ratio of failed requests to total requests:

$$
B = 1 - \frac{\sum_{i=1}^{n} f_i}{\sum_{i=1}^{n} r_i}
$$

where $f_i$ is the failed request count in minute $i$ and $r_i$ the total.
Minutes with fewer than ten requests are excluded, which is why the number
looks strange on weekend nights.

## Failure modes worth memorising

:::{danger}
Never restart both regional arbiters at once.
The planners will each elect themselves leader, emit conflicting legs for the
same parcel, and the tracker has no way to reconcile them. Recovery is manual
and takes about four hours.
:::

:::{caution}
Draining a depot during a shift change looks safe on the dashboard.
The intake queue keeps accepting manifests for up to ninety seconds after the
drain begins, and those manifests are silently dropped.
:::

:::{error}
`UnroutableError` is not retried anywhere in the pipeline.
It is terminal by design. If you see a spike, the depot graph is wrong,
not the planner.
:::

:::{hint}
The fastest way to tell a graph problem from a planner problem is to replay
yesterday's manifests against today's graph. If they fail too, it is the graph.
:::

:::{seealso}
The storage handbook covers the regional store's consistency guarantees,
which is where most planner mysteries actually originate.
:::

:::{attention}
Depot identifiers are reused after a depot is decommissioned for two years.
Historical queries that span that boundary will silently mix two locations.
:::

## Deployment

Deployments are region-at-a-time, never global.

> We tried global rollouts twice. Both times the rollback took longer than
> the outage it was meant to fix, because the depot graph had already been
> migrated forward and the previous planner could not read it.

The rollout order is fixed: smallest region first, largest region last,
with a thirty-minute soak between each.

```bash
northwind deploy --service planner --region nw-03 --soak 30m
northwind deploy --service planner --region nw-07 --soak 30m
northwind deploy --service planner --region nw-01 --soak 30m
```

### Rollback

Rollback is a forward deploy of the previous tag. There is no separate
rollback path, and there is deliberately no way to roll back the depot graph.

:::{note}
This means graph migrations must be backward compatible for one full release.
The review checklist enforces it; the tooling does not.
:::

## Open questions

Nothing below this line is settled. Treat it as a record of the arguments,
not as guidance.

- Should the planner own transit estimates, or should the tracker?
- Is the six-hour rolling window too short for cross-region legs?
- Can the hop limit become a per-region setting without breaking the contract?

The last paragraph of the document exists so that scrolling to the very bottom
shows a stable, recognisable piece of text rather than whitespace.
