---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-075
uuid: 6e3e8b10-abbc-4936-99e1-8e8d82fd4248
title: The extension is built from pinned, official dependencies
description: The repository SHALL pin Node.js 24 in its .nvmrc file, resolve
  every package of its lock file over https from registry.npmjs.org with no user
  name, password or token, and depend on @plantuml/core at one exact version,
  1.2026.6 or later, and not at a range.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-014
- StRS-MDOKFSTUDIO-DIAG-006
depends_on: []
annotation_exemption: true
exemption_reason: "Declarative: the Node version file. No implementation marker is
  possible."
derived_by: []
implemented_in_files: []
tested_in_files:
- test/security/package-contract.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-079
---

## The extension is built from pinned, official dependencies

### Normative behavior

The repository SHALL pin Node.js 24 in its .nvmrc file, resolve every package of its lock file over https from registry.npmjs.org with no user name, password or token, and depend on @plantuml/core at one exact version, 1.2026.6 or later, and not at a range.

### Scenario (nominal): Node.js pin

- GIVEN the file .nvmrc
- WHEN it is read
- THEN it holds 24

### Scenario (nominal): Official registry

- GIVEN every resolved address of the lock file
- WHEN they are parsed
- THEN each is https, on registry.npmjs.org, with no user name and no password
- GIVEN the text of the lock file
- WHEN it is searched for _authToken or a password
- THEN nothing matches

### Scenario (boundary): Exact engine version

- GIVEN the dependencies of the manifest
- WHEN @plantuml/core is read
- THEN its value is three numbers separated by dots, now 1.2026.9, with no range prefix
- GIVEN the pinned version
- WHEN it is compared with 1.2026.6
- THEN it is not older, because earlier versions are licensed under the GPL

### Scenario (refusal): Contract broken

| Input | Outcome |
| --- | --- |
| an .nvmrc that holds 22 | the package contract test fails |
| a dependency on @plantuml/core written with a caret | the package contract test fails |

### Known issues

- Known issue: An engine upgrade can change the drawing output; only the visual campaign would show it.

### Related requirements

- SwRS-MDOKFSTUDIO-DIAG-024: the useJar setting chooses the PlantUML engine

### Verification notes

- Method: Unit test test/security/package-contract.test.ts (pins Node 24 and keeps the lockfile on the official npm registry; the built-in PlantUML engine ships pinned and the JAR is an explicit opt-in setting) covers the Node.js pin, the registry and credentials check and the exact engine version.
- Criteria: The trimmed content of .nvmrc is 24. The lock file lists at least one resolved address and all of them pass. The engine value matches the pattern of three dot-separated numbers; the pin exists because versions before 1.2026.6 carry a copyleft licence and the engine internals still change between releases; the test checks the pattern only, not the comparison with 1.2026.6 (it holds today).
