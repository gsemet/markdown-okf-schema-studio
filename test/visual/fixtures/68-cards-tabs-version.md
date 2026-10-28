# Release notes

Three kinds of version notes, a card and a set of tabs, as the MyST guide writes them.

:::{versionadded} 0.47
Added support for the `.include` keyword.
:::

:::{versionchanged} 0.50
The `.include` keyword accepts a glob.
:::

:::{deprecated} 1.0
Use the `{include}` directive instead.
:::

:::{card} Claude Code
:header: Since v2.1.154, published 2026-05-28
:footer: Documented in the workflows guide

- Saved in `.claude/workflows/` or `~/.claude/workflows/`, run as `/<name>`.
- Runs in the CLI, the Desktop app and the IDE extensions.
:::

::::{tab-set}
:::{tab-item} Python
:sync: python
Install it with `pip install studio`.
:::
:::{tab-item} Node
:sync: node
:selected:
Install it with `npm install studio`.
:::
:::{tab-item} Shell
:sync: shell
Install it with `brew install studio`.
:::
::::

Text after the tabs renders normally.
