# Keep sessions across deploys

Every deploy logs everyone out today: the API keeps user sessions in process memory, so a restart
drops them and two replicas never share a cart. This plan moves the sessions to the Redis cluster
that already serves rate limiting, in three short steps that each ship on their own.

::::{grid} 1 1 3 3
:gutter: 2

:::{grid-item-card} Write to both
Week 1
^^^
New sessions go to memory and to Redis. Reads still come from memory.
+++
Behind the `dual_write` flag
:::

:::{grid-item-card} Read from Redis
Week 2
^^^
Reads switch to Redis, and a session found only in memory is copied over.
+++
A miss falls back to memory
:::

:::{grid-item-card} Drop the memory store
Week 3
^^^
The in-memory store and the flag go away.
+++
One release after the switch
:::
::::

:::{note}
From week 2 on, a deploy no longer logs anyone out, and a cart follows its user across replicas.
:::

```{code-block} python
:caption: The session lookup during week 2
:emphasize-lines: 3-5
:linenos:

def load_session(session_id: str) -> Session | None:
    session = redis_store.get(session_id)
    if session is None:
        session = memory_store.get(session_id)
        if session is not None:
            redis_store.put(session)
    return session
```
