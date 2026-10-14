# Admonition gallery

Baseline paragraph rendered before any admonition. Its colour is the reference
for every paragraph further down the page.

:::{note}
A note with a single paragraph.
:::

Paragraph immediately after a note. Must match the baseline colour exactly.

:::{warning}
A warning with a single paragraph.
:::

Paragraph immediately after a warning. Must match the baseline colour exactly.

:::{danger}
A danger block with **bold text**, *emphasis*, `inline code`,
and [a link](https://example.invalid/handbook) inside it.
:::

Paragraph immediately after a danger block. Must match the baseline colour.

## Titled admonitions

:::{warning} Vehicles are not fungible
A refrigerated vehicle can serve a dry leg, but never the reverse.
The planner does not know this and will happily emit an impossible plan.
:::

:::{note} Written by the on-call rotation
This block carries an explicit title. Exactly one title line must appear;
two title lines mean the default heading is being printed on top of the
custom one.
:::

:::{admonition} Fully custom heading
:class: tip

A generic admonition with an author-supplied class.
It should pick up the tip accent rather than the default link colour.
:::

:::{admonition} Generic with no class
A generic admonition with no class at all.
It falls back to the neutral accent.
:::

## Version changes

:::{versionadded} 1.2.3
A new capability is available.
:::

:::{versionchanged} 2.0.0
The behavior changed in this release.
:::

:::{deprecated} 3.1.0
This capability is deprecated.
:::

## Adjacent blocks

:::{tip}
First of three stacked admonitions.
:::

:::{hint}
Second of three stacked admonitions.
:::

:::{important}
Third of three stacked admonitions.
:::

Paragraph after three stacked admonitions.

## Rich content inside admonitions

:::{important}
Admonitions can hold structure, and the nested elements must keep their own
spacing rules rather than inheriting the panel padding:

1. an ordered list,
2. with a second item,
3. and a third.

```python
def contained(value: int) -> int:
    return value * 2
```

| Column A | Column B |
|----------|----------|
| first    | second   |

> A blockquote nested inside an admonition.

The final paragraph of the admonition must have no trailing margin.
:::

Final paragraph of the document, immediately after a structured admonition.
