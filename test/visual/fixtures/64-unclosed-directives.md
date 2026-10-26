# Unclosed directives

A label opened and never closed, around a table directive with no body:

(label-name

:::{table} Caption

:::

)=

The text after the broken blocks still renders, and so does the list-table opened below.

```{list-table}
