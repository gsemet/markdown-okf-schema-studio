---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-093
uuid: 759bb372-6762-42c8-afd3-79b51b11354d
title: A document loaded from a patched record gets a fresh nonce
description: When the host loads the record of a patched page as a new document,
  the extension SHALL replace the nonce of the record by a fresh one first.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-005
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## A document loaded from a patched record gets a fresh nonce

### Normative behavior

When the host loads the record of a patched page as a new document, the extension SHALL replace the nonce of the record by a fresh one first.

### Scenario: Reload of a patched record

- GIVEN a record that keeps the loaded page's nonce after patches
- WHEN it is assigned as a new document
- THEN its nonce differs from every nonce an earlier document had (unit test test/core/preview/contentPatch.test.ts "T34: the record of a patched page carries the nonce of the loaded page and keeps its shell")

### Scenario: Own nonce

- GIVEN a record that has its own nonce
- WHEN it is assigned
- THEN the nonce is kept

### Verification notes

- Method: Unit test test/core/preview/contentPatch.test.ts as named, with "T34: reuseNonce swaps every occurrence, in the policy tokens and in the attributes".
- Criteria: freshNonceRecord returns a new nonce only when recordKeepsLoadedNonce is true.

### Archived

Covered by SwRS-MDOKFSTUDIO-TRUST-022, SwRS-MDOKFSTUDIO-TRUST-023 and SwRS-MDOKFSTUDIO-TRUST-024 (nonce of every page and of a patched page).
