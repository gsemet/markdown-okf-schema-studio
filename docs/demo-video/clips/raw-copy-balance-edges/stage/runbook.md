# Release runbook

:::{important}
Run the **database migrations first**, then restart the workers one at a time.
:::

| Step | Command |
| --- | --- |
| Migrate | `just migrate` |
| Restart | `just restart-workers` |

---

The deploy script refuses to start the workers on an old schema.

:::{warning}
Never restart every worker at once: the queue drops the jobs in flight.
:::

## Rollback

Redeploy the previous tag. The migrations are backward compatible for one release.
