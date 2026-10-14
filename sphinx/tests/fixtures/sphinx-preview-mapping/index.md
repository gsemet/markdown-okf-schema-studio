# Mapping fixture

The first paragraph has a real source origin.

- The first list item has a source line.
- The second list item follows it.

:::{note}
This directive has a source origin.
:::

```{figure} fixture.svg
:alt: Fixture figure
```

```python
print("source-mapped code")
```

::::{only} html
This visible block is retained in the HTML mapping fixture.
::::

::::{only} latex
This hidden block must not appear in the HTML mapping fixture.
::::

```{include} included.md
```
