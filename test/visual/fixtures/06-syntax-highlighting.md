# Syntax highlighting across languages

Northwind Freight publishes the depot arbiter in three languages. This page is the
reference for how each one should look in the preview.

## Markdown inside Markdown

The runbook embeds its own examples, so the outer fence uses four backticks and the
inner ones use three. Both fences must survive, and the inner block must stay literal
text rather than being parsed as a nested document.

````markdown
# Depot runbook

> Escalate to the on-call arbiter before touching a primary.

1. Drain the **night intake** queue.
2. Confirm `arbiter.role == "replica"`.

```bash
northwind depot drain --id nw-07 --wait 90s
```

| Step | Owner | Timeout |
|------|-------|---------|
| drain | dispatch | 90s |
| verify | platform | 30s |

See [the escalation policy](./escalation.md) for the rest.
````

## Rust

```rust
use std::collections::BTreeMap;
use std::time::Duration;

const ELECTION_TIMEOUT: Duration = Duration::from_millis(750);

#[derive(Debug, Clone, PartialEq)]
pub enum Role {
    Primary { term: u64 },
    Replica,
}

pub struct Arbiter {
    depots: BTreeMap<String, Role>,
    term: u64,
}

impl Arbiter {
    pub fn new() -> Self {
        Self { depots: BTreeMap::new(), term: 0 }
    }

    /// Promotes a depot, returning the previous holder of the primary role.
    pub fn promote(&mut self, depot: &str) -> Option<String> {
        self.term += 1;
        let previous = self
            .depots
            .iter()
            .find(|(_, role)| matches!(role, Role::Primary { .. }))
            .map(|(name, _)| name.clone());

        if let Some(name) = &previous {
            self.depots.insert(name.clone(), Role::Replica);
        }
        self.depots.insert(depot.to_owned(), Role::Primary { term: self.term });
        previous
    }
}

fn main() {
    let mut arbiter = Arbiter::new();
    arbiter.promote("nw-07");
    println!("election timeout: {:?}", ELECTION_TIMEOUT);
}
```

## Python

```python
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Iterable

ELECTION_TIMEOUT_S = 0.75


@dataclass(slots=True)
class Depot:
    """A single freight depot in the arbiter's view of the network."""

    identifier: str
    region: str
    bays: int = 0
    tags: set[str] = field(default_factory=set)

    @property
    def refrigerated(self) -> bool:
        return "cold-chain" in self.tags


async def elect(depots: Iterable[Depot], *, timeout: float = ELECTION_TIMEOUT_S) -> Depot:
    candidates = sorted(depots, key=lambda depot: (-depot.bays, depot.identifier))
    if not candidates:
        raise ValueError("no depot is eligible for promotion")

    async with asyncio.timeout(timeout):
        await asyncio.sleep(0)  # yield once so watchers observe the transition

    winner = candidates[0]
    print(f"promoted {winner.identifier} in {winner.region!r}")
    return winner
```

## Shell, JSON and diff

```bash
#!/usr/bin/env bash
set -euo pipefail

for depot in nw-01 nw-07 nw-11; do
  northwind depot status --id "${depot}" --format json | jq '.arbiter.role'
done
```

```json
{
  "depot": "nw-07",
  "arbiter": { "role": "primary", "term": 41 },
  "bays": 24,
  "refrigerated": true,
  "lastAudit": "2024-04-19"
}
```

```{code} diff
:filename: Patch chunk
-ELECTION_TIMEOUT_S = 1.5
+ELECTION_TIMEOUT_S = 0.75
```

## An unknown grammar

A fence labelled with a grammar nobody registered must fall back to plain monospace
text rather than being mangled by a best-guess highlighter.

```wobblescript
depot nw-07 :: promote unless term > 40
```

```{tip}
Inline spans like `arbiter.role` are deliberately left unhighlighted; only fenced
blocks carry token colours.
```
