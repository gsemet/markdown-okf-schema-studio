# Diagrams and math while typing

Type in this paragraph with the preview open and watch the diagrams below for flicker.

```mermaid
flowchart LR
  A[Manifest] --> B{Valid?}
  B -- yes --> C[Plan legs]
  B -- no --> D[Reject]
  C --> E[Dispatch]
```

Inline math $E = mc^2$ and a display equation:

$$
\sum_{i=1}^{n} w_i x_i \le C
$$

```{mermaid}
sequenceDiagram
  participant P as Planner
  participant T as Tracker
  P->>T: emit legs
  T-->>P: completion
```

An invalid equation must stay readable: $\frac{1}{$.

```mermaid
pie title Fleet
  "Dry" : 60
  "Refrigerated" : 40
```

Final paragraph.
