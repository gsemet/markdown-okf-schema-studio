# agpkg install cost on a cache hit

The step takes `agpkg install` about five minutes, although every file is already in the local cache.

## Python

The file `lib/remotes/_abstract/abstract_cached_file.py`, `download_to_cache()`:

```python
downloaded = self._download_file_in_cache(
    expected_sha256=expected_sha256,
    remote_sha256=remote_sha256,
)

# Compute and record checksums for the cached file
if self._in_cache.exists():
    checksums = compute_file_checksums(self._in_cache)   # L312
```

## YAML and shell

```yaml
cache:
  enabled: true
  paths: [".agpkg/cache", "build/"]
```

```bash
set -euo pipefail
agpkg install --frozen "${PACKAGES[@]}"
```

A one-line block is never numbered:

```bash
agpkg --version
```

A language that is not bundled stays plain text:

```wobblescript
depot :: promote
depot :: drain
```

## Options of the MyST code-block

```{code-block} python
:linenos:
:lineno-start: 10
:emphasize-lines: 11

def f(x):
    return x + 1
print(f(1))
```
