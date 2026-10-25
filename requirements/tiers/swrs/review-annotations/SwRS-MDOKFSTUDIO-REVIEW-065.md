---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-065
uuid: c0557b2b-47de-454e-ae85-e004c967822c
title: A comment carries the configured, Git or system author name
description: When the host stores a comment or a reply, the extension SHALL use
  as author the comments.authorName setting, else the Git user.name of the
  document repository, else the operating system user name, else Anonymous, with
  control characters replaced by spaces and the name trimmed and cut at 100
  characters.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-003
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/comments/author.ts
- src/core/configuration/commentsConfiguration.ts
- src/host-vscode/headBaseline.ts
tested_in_files:
- test/core/comments/commentEditing.test.ts
- test/core/configuration/commentsConfiguration.test.ts
- test/host-vscode/headBaselineUserName.test.ts
- test/integration/commentWrite.test.ts
---

## A comment carries the configured, Git or system author name

### Normative behavior

When the host stores a comment or a reply, the extension SHALL use as author the comments.authorName setting, else the Git user.name of the document repository, else the operating system user name, else Anonymous, with control characters replaced by spaces and the name trimmed and cut at 100 characters.

### Scenario (nominal): Setting wins

- GIVEN the setting authorName set to Ada Reviewer and a Git user.name of Bob
- WHEN a comment is saved
- THEN the author is Ada Reviewer

### Scenario (boundary): Order of the sources

| Input | Outcome |
| --- | --- |
| The setting is set | The author is the setting |
| The setting is empty and the Git user.name is Bob | The author is Bob |
| The setting and the Git name are empty and the operating system user name is known | The author is the operating system user name |
| An empty setting, no Git name and no system user name | The author is Anonymous |

### Scenario (boundary): The name is cleaned and cut

| Input | Outcome |
| --- | --- |
| An author name holding a tab or a line break | Each control character becomes a space and the ends are trimmed |
| A name of 150 characters | The name is cut at 100 characters |

### Scenario (nominal): The Git user name is read through the built-in Git extension

- GIVEN a repository whose user.name is "  Ada  "
- WHEN the host needs the Git user name of the document
- THEN the name is Ada

### Scenario (refusal): No Git user name

- GIVEN no Git extension, no repository, no getConfig or an empty value
- WHEN the host reads the Git user name
- THEN no name is returned and the next source is used

### Scenario (boundary): The comments.authorName setting

| Input | Outcome |
| --- | --- |
| The setting is set to Ada Reviewer | The author name is Ada Reviewer |
| The setting is set to a number | The author name is the empty default |
| The setting as declared by the extension | It is in the Comments category with type string and default empty |

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-054: the host stores the new thread with this author.
- SwRS-MDOKFSTUDIO-REVIEW-074: the host stores the reply with this author.

### Verification notes

- Method: test/core/comments/commentEditing.test.ts, unit test `T43: resolveAuthor uses the setting, then Git, then the OS user, then Anonymous` (Setting wins, Order of the sources, The name is cleaned and cut).
- Method: test/integration/commentWrite.test.ts (author Ada Reviewer from the setting; the Git or system name is never empty), covering Setting wins and Order of the sources.
- Method: test/host-vscode/headBaselineUserName.test.ts, unit tests `T43: userName reads user.name through the Git API and trims it` (The Git user name is read through the built-in Git extension), `T43: userName is undefined without Git, a repository, getConfig or a value` (No Git user name).
- Method: test/core/configuration/commentsConfiguration.test.ts, unit tests `T43: reads the author name of the comments section` and `T43: a non-string author name falls back to the empty default` (The comments.authorName setting), and test/security/package-contract.test.ts (the setting is listed).
- Criteria: The author follows the four-step order. The stored name has no control character and at most 100 characters. userName returns the trimmed value or undefined. The setting exists in the Comments category with type string and default empty.
