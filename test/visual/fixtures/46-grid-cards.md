# Grid of cards

A responsive grid with `1 1 2 2` columns: one column in a narrow pane, two in a wide one.

::::::{grid} 1 1 2 2

:::{grid-item}
A plain grid item with **bold** text, `inline code` and a short list:

- first
- second
:::

:::{grid-item-card} Linked card
:link: targets/alpha.md

Header of the card
^^^
The body of the card carries the main text and stays readable on every theme.
+++
Footer of the card
:::

:::{grid-item-card} Card without link
The body only, with a [regular link](targets/beta.md) inside.
:::

:::::{grid-item-card} Nested grid
::::{grid} 2
:::{grid-item}
Inner one.
:::
:::{grid-item}
Inner two.
:::
::::
:::::

::::::

Text after the grid renders normally.
