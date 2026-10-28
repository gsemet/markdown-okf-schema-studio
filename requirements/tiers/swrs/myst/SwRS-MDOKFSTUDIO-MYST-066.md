---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-066
uuid: 0276317b-3ce9-44cd-8013-883ca64d5c6f
title: The governing conf.py is found and read as text
description: When a document is checked, the extension SHALL take its enabled
  MyST extensions from the governing `conf.py`, found as the nearest one in the
  document's folder or any folder up to the workspace root (never one above the
  root, and for a document outside the workspace only its own folder) or else as
  the single conf.py of a common Sphinx folder at the root, read as text and
  never run, and report nothing when no certain list results.
project: markdown-okf-schema-studio
scope: myst
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/myst/confLocator.ts
- src/core/myst/confParser.ts
tested_in_files:
- test/core/myst/confLocator.test.ts
- test/core/myst/confParser.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-MYST-067
- SwRS-MDOKFSTUDIO-MYST-068
- SwRS-MDOKFSTUDIO-MYST-069
- SwRS-MDOKFSTUDIO-MYST-070
- SwRS-MDOKFSTUDIO-MYST-089
---

## The governing conf.py is found and read as text

### Normative behavior

When a document is checked, the extension SHALL take its enabled MyST extensions from the governing `conf.py`, found as the nearest one in the document's folder or any folder up to the workspace root (never one above the root, and for a document outside the workspace only its own folder) or else as the single conf.py of a common Sphinx folder at the root, read as text and never run, and report nothing when no certain list results.

### Scenario (nominal): The nearest conf.py governs
- GIVEN conf.py in two ancestor folders
- WHEN a document below both is checked
- THEN the nearer one governs

### Scenario (boundary): The workspace root bounds the search
- GIVEN a conf.py above the workspace root, or a document outside the workspace
- WHEN a document is checked
- THEN the root-outside file is not used and the outside document gets no fallback, only its own folder is looked at

### Scenario (boundary): A single common-folder conf.py is the fallback
Applies when no conf.py is found above the document. The common folders at the workspace root are docs/, doc/, sphinx/, source/ and docs/source/.

| Input | Outcome |
| --- | --- |
| Only sphinx/conf.py, document at the root | that file governs |
| Two or more candidate conf.py files in the common folders | no conf governs |
| An ancestor conf.py and a common-folder candidate | the ancestor wins |

### Scenario (nominal): A conf.py listing a MyST parser is read as text
- GIVEN a conf.py whose `extensions` contains myst_parser or myst_nb
- WHEN a document is checked
- THEN missing extensions are reported, and the conf.py is never executed

### Scenario (refusal): Without a certain MyST list nothing is reported
| Input | Outcome |
| --- | --- |
| No conf.py | nothing is reported and rendering is unchanged |
| conf.py without myst_parser or myst_nb in `extensions` | nothing is reported and rendering is unchanged |
| An uncertain list | nothing is reported and rendering is unchanged |
| An I/O error reading the file | nothing is reported and rendering is unchanged |

### Scenario (nominal): List literal forms are read completely
- GIVEN `extensions` or `myst_enable_extensions` written as list or tuple literals with single, double and triple quotes, comments, trailing commas, implicit string joins, and backslash or bracket continuations
- WHEN the file is read
- THEN the element list is complete and correct

| Input | Outcome |
| --- | --- |
| CRLF line endings | the same elements result |
| r or u string prefixes | the same elements result |

### Scenario (nominal): Mutations are applied in written order
- GIVEN `extensions = ["a"]`, then `.append("b")` and `+= ["c"]`
- WHEN the file is read
- THEN the list is a, b, c in that order

The forms `=`, `+=`, `.append`, `.extend` and list addition are applied in order; `.extend([...])` followed by a later `=` reassignment gives the later assignment as the result.

### Scenario (refusal): Computed values make the list uncertain
| Input | Outcome |
| --- | --- |
| `extensions = load()` (computed value) | the result is uncertain and no warning is shown |
| An f-string element | the same suppression applies |
| A bytes or other prefixed string element | the same suppression applies |
| A `-=` change | the same suppression applies |

Certainty is all or nothing.

### Verification notes
- Method: test/core/myst/confLocator.test.ts ("the nearest conf.py wins and the enabled set comes from it": nearest, workspace root; "D29: a single conf.py in a common folder of the root is the fallback": common folder; "no conf.py, no myst_parser or an uncertain conf.py give no set": read as text, nothing reported, uncertain)
- Method: test/core/myst/confParser.test.ts ("comments, tuples, single quotes, trailing commas and string joins are understood": list literal forms; "+=, append, extend and later assignments are applied in order": mutations; "anything that is not a plain string list is uncertain": uncertain)
- Criteria: Standalone and untrusted previews use the same lookup. The file is never executed. CRLF line endings and r or u prefixes have no dedicated assertion (untested).
