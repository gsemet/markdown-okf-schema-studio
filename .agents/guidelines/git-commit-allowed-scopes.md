# Conventional Git commit message scope:

Allowed scopes in `type(scope): short title`, only for `fix` and `feat` types.

- `vscode`: for all related to vscode extension exposition, settings, UI,...
- `render`: for rendering changes, in both preview and edition mode
- `editor`: for changes related to the edition mode
- `frontmatter`: for the changes related to the behavior on standalone frontmatter and OKF-schema bundle

Do not use scope for `build` or `ci`.

Never use `fix(ci)` or `feat(buildsystem)`.
- Use `ci` for every changes related to the CI
- Use `build` when evolving the local build system
