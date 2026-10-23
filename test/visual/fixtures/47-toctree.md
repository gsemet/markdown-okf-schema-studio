# Table of contents

```{toctree}
:caption: Guides
:maxdepth: 2

targets/alpha
Custom title <targets/beta>
targets/missing-chapter
```

Text between two trees.

```{toctree}
:caption: Everything in targets
:glob:

targets/*
```

```{toctree}
:hidden:
:caption: Hidden tree

targets/alpha
```

Text after the trees renders normally.
