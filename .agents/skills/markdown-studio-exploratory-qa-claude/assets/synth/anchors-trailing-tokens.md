# Trailing tokens in table rows

A plain paragraph before the tables. ^para-top

## T1 block id after the closing pipe

| Name | Value | Note |
| --- | --- | --- |
| alpha | 1 | first | ^row-a
| beta | 2 | second |
| gamma | 3 | third |

## T2 block id inside the last cell

| Name | Value | Note |
| --- | --- | --- |
| alpha | 1 | first ^row-b |
| beta | 2 | second |
| gamma | 3 | third |

## T3 heading-style id after the closing pipe

| Name | Value | Note |
| --- | --- | --- |
| alpha | 1 | first | {#row-c}
| beta | 2 | second |
| gamma | 3 | third |

## T4 anchor element in the last cell

| Name | Value | Note |
| --- | --- | --- |
| alpha | 1 | first <a id="x"></a> |
| beta | 2 | second |
| gamma | 3 | third |

## T5 trailing comment after the closing pipe

| Name | Value | Note |
| --- | --- | --- |
| alpha | 1 | first | <!-- keep -->
| beta | 2 | second |
| gamma | 3 | third |

## T6 trailing spaces after the closing pipe

| Name | Value | Note |
| --- | --- | --- |
| alpha | 1 | first |   
| beta | 2 | second |
| gamma | 3 | third |

Another paragraph after the tables. ^para-end
