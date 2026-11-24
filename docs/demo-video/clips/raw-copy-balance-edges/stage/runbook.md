# Release runbook: payments service

Deploy on a weekday morning, with the on-call engineer in the channel.

:::{important} Before you deploy
Run the database migrations first, then restart the workers one at a time.
:::

The deploy script checks the migration version and refuses to start the workers on an old schema.

## Rollback

Redeploy the previous tag. The migrations are backward compatible for one release.
