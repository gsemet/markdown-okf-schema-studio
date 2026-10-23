# List tables

A pipe table for reference:

| Fruit | Price |
| --- | --- |
| apple | 3 |
| pear | 4 |

A list-table with a title, column widths and a centred table:

```{list-table} Fruit prices
:header-rows: 1
:widths: 25 75
:align: center

* - Fruit
  - Notes
* - apple
  - Sold by the **kilo**, `3.20` each, from the *north* orchard
* - pear
  - Sold in boxes of six
```

A list-table with two header rows and no title:

```{list-table}
:header-rows: 2

* - Fruit
  - Price
* - name
  - EUR
* - apple
  - 3
* - pear
  - 4
```
