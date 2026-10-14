---
type: skill
id: internal-tooling-guide
name: Local tooling guide
description: "Documents nested YAML and list metadata for the editor preview."
status: internal-only
required:
  - name
  - summary
properties:
  lifecycle:
    enum:
      - draft
      - active
allowed-tools:
  - Read
  - "Bash(uv run *)"
metadata:
  owner: "Developer Experience"
  review:
    required: false
    attempts: 3
---

# Local tooling guide

This ordinary Markdown file carries scalar, list, and nested YAML metadata, including
fields that resemble an OKF document but have no matching schema.
