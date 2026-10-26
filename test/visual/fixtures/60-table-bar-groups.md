# Table bar groups

Edit mode opens the bar above this table: the row buttons, the column buttons and the table
button form three groups, and the cell formatting group follows its own rule.

| Signal     | Source        | Meaning                                  | Unit | Check    |
| ---------- | ------------- | ---------------------------------------- | ---- | -------- |
| brake_pos  | pedal sensor  | Travel of the brake pedal in millimetres | mm   | range    |
| brake_rel  | derived       | True once the pedal is back at rest      | bool | latency  |
| brake_lamp | body computer | Drives the stop lamp                     | bool | polarity |
