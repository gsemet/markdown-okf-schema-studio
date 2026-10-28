---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-013
uuid: aac03683-63ca-497b-a009-6543caf7176e
title: Includes are bounded by depth, budget, size and allowed roots
description: When a chain of includes reaches the 8th level, an include repeats
  a file already being included, a render has expanded 2000 includes or 10 Mi
  characters of included text, an included file is larger than 5 MiB or cannot
  be read, or an include points outside the allowed roots, uses an absolute path
  or a URL scheme, has an undecodable path, has a symlink that escapes its root
  or names a missing file, the extension SHALL leave that directive as an
  unresolved placeholder and, for a refused or missing file or an exhausted
  budget, list a warning naming the request without reading a refused file.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-002
- StRS-MDOKFSTUDIO-CORE-003
- StRS-MDOKFSTUDIO-TRUST-006
depends_on:
- SwRS-MDOKFSTUDIO-CORE-012
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystRenderer.ts
- src/core/render/renderPipeline.ts
- src/core/security/resource-policy.ts
tested_in_files:
- test/core/render/contentCaches.test.ts
- test/core/render/includeBudget.test.ts
- test/core/render/renderReq.renderingCore.requirements.test.ts
- test/integration/projectFeatures.test.ts
- test/security/resource-policy.test.ts
- test/security/trustReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## Includes are bounded by depth, budget, size and allowed roots

### Normative behavior

When a chain of includes reaches the 8th level, an include repeats a file already being included, a render has expanded 2000 includes or 10 Mi characters of included text, an included file is larger than 5 MiB or cannot be read, or an include points outside the allowed roots, uses an absolute path or a URL scheme, has an undecodable path, has a symlink that escapes its root or names a missing file, the extension SHALL leave that directive as an unresolved placeholder and, for a refused or missing file or an exhausted budget, list a warning naming the request without reading a refused file.

### Scenario (nominal): Stop include depth

- GIVEN a chain of eight nested includes
- WHEN it is rendered
- THEN the first seven expand and the eighth stays a placeholder

### Scenario (refusal): Stop include cycles

- GIVEN a file that includes itself
- WHEN it is rendered
- THEN the cyclic include stays a placeholder and the render ends

### Scenario (boundary): Limit the include budget per render

| Input | Outcome |
| --- | --- |
| a document with 2001 include directives | 2000 are expanded, the rest are placeholders and one budget warning ("Include budget exhausted") is listed |
| 10 Mi characters of included text expanded | the remaining includes are placeholders and one budget warning is listed |
| a document within both limits | no budget warning is listed |

### Scenario (boundary): Refuse oversize and unreadable included files

| Input | Outcome |
| --- | --- |
| an included file of 5 MiB plus one byte | the directive stays a placeholder and the file is not expanded |
| an included file of exactly 5 MiB | the file is expanded |
| a file inside the roots that the process cannot read | the directive stays a placeholder and nothing of the file is shown |

### Scenario (refusal): Refuse includes outside the allowed roots

| Input | Outcome |
| --- | --- |
| an include of `../../secret.md` outside the roots | the file is not read and a warning with its value is listed |
| an include with an `https:` URL | the URL is not fetched and a warning is listed |
| an include with an absolute path | the file is not read and a warning naming the request is listed |
| an include with an undecodable path | the file is not read and a warning naming the request is listed |
| an include with a symlink that escapes its root | the file is not read and a warning naming the request is listed |

### Scenario (refusal): Warn about a missing included file

- GIVEN an include of `missing.md`
- WHEN it is rendered
- THEN a warning for `missing.md` is listed in the status region

### Scenario (boundary): The warning ends when the file exists

- GIVEN the file `missing.md` is created and the document re-rendered
- WHEN it is rendered
- THEN the warning disappears and the content is expanded

### Scenario (boundary): A file is checked once per render

- GIVEN a document that references the same image or include several times, existing or missing
- WHEN the preview renders it
- THEN the policy asks the file system once per distinct path (one stat, one real-path lookup) and still reports every refusal; the next render asks again, so a file that appears or changes is seen

### Related requirements

- SwRS-MDOKFSTUDIO-CORE-012: an include is expanded in place

### Verification notes

- Method: Unit test "include expansion output is unchanged for ordinary documents" in test/core/render/includeBudget.test.ts (nominal depth, refusal cycle)
- Method: Unit test "include fan-out stops at the budget with one diagnostic" in test/core/render/includeBudget.test.ts (boundary budget; the 10 Mi characters row is untested by a named case)
- Method: Unit test "an included file over 5 MiB stays a placeholder and a file of exactly 5 MiB is expanded" in test/core/render/renderReq.renderingCore.requirements.test.ts (boundary oversize rows)
- Method: Unit test "an include that cannot be read is left unresolved" in test/security/trustReq.requirements.test.ts (boundary unreadable file)
- Method: Unit test "canonicalizes local resources and rejects hostile paths" in test/security/resource-policy.test.ts (refusal outside the roots, URL scheme, absolute path, undecodable path, symlink)
- Method: Integration suite run() in test/integration/projectFeatures.test.ts (refusal missing file, boundary warning ends)
- Method: test/core/render/contentCaches.test.ts (five references to an existing and a missing file: one stat per path, one real-path lookup, five refusals reported)
- Criteria: Depth 8 and cycles leave the directive unexpanded. One "Include budget exhausted" warning appears at the limit and none below it. The 5 MiB limit is inclusive of the file size; larger files stay placeholders. A refusal of the shared reader gives the renderer no text. Each refusal code lists a warning item and reads no file. The warning appears while the file is missing and not after.
