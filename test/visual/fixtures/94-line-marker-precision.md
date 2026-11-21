---
# A comment line of the front matter
title: Marker precision
owner: alice
tags:
  - one
  - two
---

# Line marker precision

| name | value |
| --- | --- |
| alpha | 1 |
| beta | 2 |

> | quoted | value |
> | --- | --- |
> | first | 1 |
> | second | 2 |

:::{note}
| note | value |
| --- | --- |
| north | 1 |
| south | 2 |
:::

::::::{tab-set}
:::::{tab-item} First
First tab text.
:::::
:::::{tab-item} Second
The second tab holds a paragraph that is written long enough to wrap over several lines in a nine hundred pixel pane, so that a wrapped line exists to be found.
This is the second source line of that paragraph, also long enough to wrap in the pane and to carry on the thought of the first one.
The third source line of this paragraph is the one that is asked for.

```python
second_tab_code = 1
second_tab_more = 2
```

::::{tab-set}
:::{tab-item} Inner
Inner tab text.
:::
:::{tab-item} Other
Nested hidden tab line.
:::
::::
:::::
::::::

A closing paragraph, a mapped block that edit mode can open.
