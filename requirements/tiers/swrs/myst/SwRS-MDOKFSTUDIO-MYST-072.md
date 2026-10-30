---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-072
uuid: 007d57b5-c2f6-4d59-af7f-d8cb1ff0777f
title: MyST syntax of a disabled extension is reported with its line
description: When a document uses syntax of a MyST extension that the governing
  conf.py does not enable, the extension SHALL list one `myst-extension` warning
  per extension, at the first use of that syntax and with the line of the syntax
  itself, at most 10 per render, and leave the rendering unchanged.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/previewStatus.ts
- src/core/render/mystRenderer.ts
- src/core/render/mystSyntaxDetect.ts
tested_in_files:
- test/core/render/mystSyntaxDetect.test.ts
- test/core/render/renderPipeline.test.ts
- test/core/render/renderReq.myst.requirements.test.ts
- test/page/modules/warningBanner.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CORE-064
- SwRS-MDOKFSTUDIO-MYST-030
- SwRS-MDOKFSTUDIO-MYST-073
- SwRS-MDOKFSTUDIO-MYST-074
- SwRS-MDOKFSTUDIO-MYST-075
- SwRS-MDOKFSTUDIO-MYST-076
- SwRS-MDOKFSTUDIO-MYST-077
---

## MyST syntax of a disabled extension is reported with its line

### Normative behavior

When a document uses syntax of a MyST extension that the governing conf.py does not enable, the extension SHALL list one `myst-extension` warning per extension, at the first use of that syntax and with the line of the syntax itself, at most 10 per render, and leave the rendering unchanged.

### Scenario (nominal): Each missing extension is detected once at its first use
The detected extensions are colon_fence, dollarmath, amsmath, deflist, fieldlist, tasklist, strikethrough, substitution, attrs_inline, html_image and html_admonition.
- GIVEN `:::` and `$x$` in a document whose conf.py enables neither
- WHEN the document is checked
- THEN colon_fence and dollarmath are detected once each, ordered by line, and the rendering is unchanged

### Scenario (boundary): The same syntax twice gives one warning
- GIVEN a document using the same syntax twice
- WHEN the document is checked
- THEN one detection per extension, the first use

### Scenario (nominal): The warning carries the line of the syntax
- GIVEN a document with frontmatter and syntax on its ninth line
- WHEN the document is checked
- THEN the warning line is 9, the frontmatter lines being counted

| Input | Outcome |
| --- | --- |
| Syntax inside a long paragraph | the line is the line of the syntax itself, not of the paragraph start |
| CRLF line breaks | lines are split like LF |
| CR line breaks | lines are split like LF |

### Scenario (nominal): The status list shows the fixed wording
- GIVEN a missing dollarmath
- WHEN the preview renders
- THEN the status area lists one warning as file:line: message, severity warning and code myst-extension, reading: `SYNTAX` is used but this needs the MyST extension `EXTENSION`, which is not enabled in your conf.py. Add "EXTENSION" to `myst_enable_extensions`. (SYNTAX is the used syntax, EXTENSION the missing extension), and the rendering is unchanged
- GIVEN another render diagnostic
- WHEN the preview renders
- THEN it is coded myst-diagnostic

### Scenario (refusal): Nothing is reported for look-alikes, code, includes or a missing conf
| Input | Outcome |
| --- | --- |
| No conf.py | no warning is listed |
| `$x$` in a fenced block, an indented code block, inline code, a comment or a role | nothing is reported |
| `{math}` role, a backtick-fence directive, braces, `{% %}` or `$ 5` | none counts as dollarmath, colon_fence or substitution |
| A `$$` block with a leading begin align | amsmath-guarded |
| Prices such as `$19 base ... ($200)`, `$5 and $6` or `$100-$380` with a conf.py without dollarmath | no myst-extension warning is raised |
| A real `$x$` span (opening `$` not followed by a space, closing `$` not after a space or before a digit) | dollarmath is reported as missing |
| An included file (`{include}`) using colon fences without colon_fence enabled | no warning is raised for the included text |
| The same syntax in the document's own text | the warning is raised |

### Scenario (boundary): At most 10 warnings are kept
| Input | Outcome |
| --- | --- |
| 11 missing extensions | 10 warnings are kept |
| 10 or fewer missing | all are kept |

### Verification notes
- Method: test/core/render/mystSyntaxDetect.test.ts ("detects ${name}": first use of each extension; "only the first use per extension is reported": once per extension; "the line is the line of the syntax inside a long paragraph and counts the frontmatter": line; "nothing is detected inside code fences or inline code": look-alikes and code; "prices and ordinary braces are not math or substitutions": prices)
- Method: test/core/render/renderPipeline.test.ts ("MyST syntax missing from the nearest conf.py warns once per extension, rendering unchanged": nominal detection, wording, no conf, rendering unchanged)
- Method: test/core/render/renderReq.myst.requirements.test.ts ("at most 10 extension warnings are kept and 10 or fewer are all kept": cap; "an included file is not checked against conf.py while the document's own text is": includes)
- Method: test/page/modules/warningBanner.test.ts ("CR 050: the status region marks the conf.py warnings with their code": status list code myst-extension)
- Criteria: One warning per extension, capped at 10 (MAX_EXTENSION_WARNINGS). The wording is fixed. Only the document's own text is read. CRLF and CR line breaks have no dedicated assertion (untested).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-007](../../strs/myst/StRS-MDOKFSTUDIO-MYST-007.md): Sphinx configuration gaps are reported before building
- Supersedes:
  - [SwRS-MDOKFSTUDIO-CORE-064](../rendering-core/SwRS-MDOKFSTUDIO-CORE-064.md): Warn about MyST syntax of a disabled extension
  - [SwRS-MDOKFSTUDIO-MYST-030](SwRS-MDOKFSTUDIO-MYST-030.md): Prices are not reported as missing dollarmath
  - [SwRS-MDOKFSTUDIO-MYST-073](SwRS-MDOKFSTUDIO-MYST-073.md): At most 10 extension warnings are kept
  - [SwRS-MDOKFSTUDIO-MYST-074](SwRS-MDOKFSTUDIO-MYST-074.md): Detection ignores code, comments, roles and look-alikes
  - [SwRS-MDOKFSTUDIO-MYST-075](SwRS-MDOKFSTUDIO-MYST-075.md): Warnings carry the line of the syntax
  - [SwRS-MDOKFSTUDIO-MYST-076](SwRS-MDOKFSTUDIO-MYST-076.md): Included files are not checked against conf.py
  - [SwRS-MDOKFSTUDIO-MYST-077](SwRS-MDOKFSTUDIO-MYST-077.md): Extension warnings use the fixed wording and status list
<!-- okf:links:end -->
