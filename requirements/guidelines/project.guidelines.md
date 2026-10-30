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
