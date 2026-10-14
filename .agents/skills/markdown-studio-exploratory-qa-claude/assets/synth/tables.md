# Table formatting variants

Edit one cell in each table and diff the buffer: only that line may change.

## Compact delimiter

|Name|Value|
|---|---|
|alpha|1|
|beta|2|

## Aligned and padded

| Name     | Align left | Centered | Right |
|:---------|:-----------|:--------:|------:|
| alpha    | left       |  middle  |     1 |
| beta     | text       |   mid    |    22 |

## Escaped pipes and inline code

| Expression | Meaning |
| --- | --- |
| `a \| b` | either |
| x\|y | escaped |

## Single column

| Only |
| --- |
| one |
