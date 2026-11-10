# Anchors and tables

(intro-label)=
## Heading with explicit id {#heading-id}

A paragraph before the table, with a block id. ^para-before

(table-label)=

| Name | Value | Note |
| --- | --- | --- |
| alpha | 1 | first row ^row-a |
| beta | 2 | <a id="cell-anchor"></a>second row |
| gamma | 3 | third row |

A paragraph right after the table. Reference {ref}`table-label` here. ^para-after

- list item one
- list item two ^item-two

### Second heading {#second-id}

The retry budget is exceeded when three consecutive calls fail.

| Key | Meaning |
| --- | --- |
| retry | the retry budget |
| cache | warmed at start-up |

Last paragraph with a thread target.

## Tight label above a table

(tight-label)=
| A | B |
| --- | --- |
| a1 | b1 |
| a2 | b2 |

Closing paragraph after the tight table.
