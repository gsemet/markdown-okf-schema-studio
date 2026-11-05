# Project requirements guidelines

This file specializes the shared okfreq guidelines of this folder for this project.

## The bundle stays a native OKF v0.2 bundle

`requirements/tiers/` is read by plain OKF consumers, not only by okfreq. okfreq (okf-schema 0.17
or later) projects its vocabulary onto OKF fields on `okfreq update-coverage` and `okfreq lint`,
run by `just requirements-update` and checked by `just requirements-lint`. The schemas of
`tiers/_schema/` declare the projection:

- The okfreq lifecycle field is `req_lifecycle` (`lifecycle.field` in `config.yml`). Its
  `x-okf-status-projection` mapping generates the OKF `status`: `draft` is `draft`, `proposed`
  and `approved` are `stable`, `deprecated` and `superseded` are `deprecated`.
- An owner approval (`approved_by`, `approved_at`, an ISO 8601 datetime with a UTC offset) is
  also generated as an OKF `verified` event `{by: human:<approved_by>, at: <approved_at>}`.
- Each field whose `x-okf-link` carries a `link-projection` label (`derives_from`, `derived_by`,
  `depends_on`, `superseded_by`, `supersedes`, `relates_to`) is generated as a group of Markdown
  links in a `### Links` section at the end of the body, between `<!-- okf:links:start -->` and
  `<!-- okf:links:end -->`. Only resolutions inside the bundle (`filename-stem`,
  `bundle-relative`) can be projected.

Never hand-edit `status`, `verified` or the Links block; change `req_lifecycle`, the approval,
the relations or the schema annotations and run `just requirements-update`.

## Log headings

A heading of `tiers/log.md` is exactly `## YYYY-MM-DD`, newest first, one per date. The topic of
an entry goes in a `### Topic` sub-heading under its date, never in the date heading.

## During a change

These rules hold for every change, whoever makes or checks it.

### Requirements traceability

Every change, no exception. A change is incomplete when a behaviour change has no SwRS update, or
a touched requirement lacks its `@implements_req` or a `@tests_req` at each test, or
`just requirements-update` was not run. The agent that makes the change updates the SwRS and the
markers in the same change: `@implements_req <ID>` next to the implementation **and**
`@tests_req <ID>` next to **each** test that checks it, for every touched leaf requirement;
`just requirements-update` run and its generated files committed; a dated entry in the bundle's
`tiers/log.md`; a refactor moves the markers with the code. Never leave a touched requirement
without a source or a test link.

Before the PR is opened, the agent that opens it (for a stack, per branch) runs the check as CI
runs it (`okfreq validate --check-links --project-root .` and coverage with CI's okfreq version);
a gap is fixed before the PR opens. The PR body's Tests section lists the requirement IDs added or
changed with their source and test files.

### Approved requirements

Before the change starts, the requirements the change would alter are listed: every `approved`
requirement it would change (normative statement, scenarios, criteria, deprecation, supersession)
with its owner (`owner_email`, else `default_owner_email`). The owner is asked explicitly whether
they agree, and the answer is recorded in the change's specification. No agreement: the change does
not touch those requirements. With agreement, the author sets `approved_by` to the owner's email and
`approved_at` to the current date and time with its UTC offset (ISO 8601, for example
`2026-10-28T09:00:00+01:00`), the PR body lists those requirements under "Approved requirements
changed", and the agent that opens the PR requests the owner's review on the PR. Nobody approves a
requirement, nor changes an approved one, without that recorded agreement; `okfreq validate` fails
on an approved requirement without `approved_by` and `approved_at`. New requirements delivered with
their code are created `proposed` (`okfreq new … --lifecycle proposed`), never `draft`.
