---
type: finding
---

# Verification notes

- Method: automated CLI tests over fixed knowledge-base fixtures.
- Criteria: repeated operations are stable and failed operations leave authored
  fixture content intact.

Run order:

1. Load the fixtures.
2. Run the operations.
3. Compare the results.
4. Report the findings.
