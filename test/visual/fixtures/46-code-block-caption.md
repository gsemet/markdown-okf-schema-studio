# Captioned code blocks

A plain fenced block, for comparison.

```python
def plain() -> str:
    return "left aligned"
```

A MyST code-block with a caption, line numbers and an emphasized line.

```{code-block} python
:caption: src/export.py
:linenos:
:emphasize-lines: 2

import csv
import io


def export_rows(rows: list[list[str]]) -> str:
    output = io.StringIO(newline="")
    return output.getvalue()
```

A second one with only a caption.

```{code-block} python
:caption: src/init.py

from src.export import export_rows
```

Text after the blocks.
