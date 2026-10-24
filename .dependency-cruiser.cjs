/**
 * Import boundaries of `src/` (dependency-cruiser), run by `just check-boundaries` through
 * `scripts/check-boundaries.mjs`, which transpiles `src/` first (TypeScript 7 has no compiler API
 * for dependency-cruiser to read `.ts` files with). The layers and why they exist are described in
 * CONTRIBUTING.md ("Architecture").
 *
 * Layers (a folder of `src/` each):
 *   core           host-neutral logic: parse, render, sanitize, source mapping, edit operations,
 *                  protocol, settings normalization, page assets built in Node. No vscode, no DOM,
 *                  no Node built-ins (except the debt listed in NODE_DEBT).
 *   host-api       the port interfaces (and capabilities) every host implements; speaks core types.
 *   page           the preview page (browser bundle): runtime, features, page modules.
 *   node-services  Node implementations of ports and Node-only services (files, processes,
 *                  Sphinx build, watchers).
 *   session        the host-neutral controllers: PreviewManager, PreviewSession, feature
 *                  controllers. Ports only (plus the debt listed in SESSION_NODE_SERVICES_DEBT).
 *   host-memory    an in-memory host (documents and files) for tests and future headless hosts.
 *   host-vscode    the VS Code host: activation, adapters of the ports, test hooks. With
 *                  `src/extension.ts`, the only code that may import `vscode`.
 *
 * Exceptions are listed below, each with its reason and where it goes away. Never add one to make
 * a new import pass: move the code, or put the access behind a port.
 */

/**
 * Core files that still import Node built-ins, with the only built-ins each may use, why, and the
 * plan that removes the exception. Synchronous file access and process spawning that predate the
 * ports (see the "Leaks" table of the multi-host analysis). They work in every Node host (VS Code,
 * a future headless host) but block a browser build of the core. Pure `path` arithmetic is listed
 * too: a browser build would need a path shim.
 *
 * Removal plans:
 *   RENDERER_SPLIT  the planned split of the renderer and frontmatter internals (later step of the
 *                   host-neutral core refactor) removes it.
 *   PORT_FOLLOW_UP  a follow-up change moves the access behind the `FileSystem` / `ProcessRunner`
 *                   port (async, so it changes timing and is out of a pure move step).
 *   PATH_SHIM       pure path arithmetic: stays until a browser build of the core adds a path shim.
 *   WEB_CRYPTO      follow-up: replace the import with WebCrypto (`globalThis.crypto`).
 */
const RENDERER_SPLIT = "removed by the renderer/frontmatter split (later step of this refactor)";
const PORT_FOLLOW_UP = "follow-up change: move the access behind the FileSystem / ProcessRunner port";
const PATH_SHIM = "kept: pure path arithmetic, needs a path shim for a browser build";
const WEB_CRYPTO = "follow-up change: use WebCrypto (globalThis.crypto) instead of node:crypto";
const NODE_DEBT = {
  "src/core/comments/commentStore.ts": {
    builtins: ["crypto"], reason: "comment ids and text hashes", removal: WEB_CRYPTO },
  "src/core/frontmatter/fileLinks.ts": {
    builtins: ["fs", "path"], reason: "sync existence checks of linked files", removal: PORT_FOLLOW_UP },
  "src/core/frontmatter/okfFrontmatter.ts": {
    builtins: ["fs", "path", "util"], reason: "sync schema lookup next to the document, isDeepStrictEqual",
    removal: RENDERER_SPLIT },
  "src/core/frontmatter/stemIndex.ts": {
    builtins: ["fs", "path"], reason: "sync walk of the workspace for filename stems", removal: PORT_FOLLOW_UP },
  "src/core/mapping/imageReference.ts": {
    builtins: ["path"], reason: "relative image paths", removal: PATH_SHIM },
  "src/core/mapping/mystTargets.ts": {
    builtins: ["path"], reason: "relative bibliography paths", removal: PATH_SHIM },
  "src/core/myst/confLocator.ts": {
    builtins: ["fs", "path"], reason: "sync search of the governing conf.py", removal: PORT_FOLLOW_UP },
  "src/core/render/documentGlob.ts": {
    builtins: ["fs", "path"], reason: "sync toctree glob expansion", removal: PORT_FOLLOW_UP },
  "src/core/render/mystRenderer.ts": {
    builtins: ["path"], reason: "include and image path resolution", removal: PATH_SHIM },
  "src/core/render/plantUmlIncludes.ts": {
    builtins: ["path"], reason: "!include path resolution", removal: PATH_SHIM },
  "src/core/render/plantUmlRenderer.ts": {
    builtins: ["child_process", "fs", "path"], reason: "runs the PlantUML jar",
    removal: "follow-up change: spawn the jar through the existing ProcessRunner port" },
  "src/core/render/renderPipeline.ts": {
    builtins: ["path", "perf_hooks"], reason: "include roots (path), render timings (perf_hooks)",
    removal: `perf_hooks ${RENDERER_SPLIT} (use the global performance); path ${PATH_SHIM}` },
  "src/core/security/csp.ts": {
    builtins: ["crypto"], reason: "CSP nonce", removal: WEB_CRYPTO },
  "src/core/security/resource-policy.ts": {
    builtins: ["fs", "path"], reason: "realpath checks of local resources", removal: PORT_FOLLOW_UP },
};

/**
 * node-services modules the session layer still imports directly instead of through a port. Each
 * is synchronous Node access the session needs today; it goes away when a port covers it (a
 * `realpath`/`exists` on `FileSystem`, a build-queue factory and a linked-file watcher on the host).
 */
const SESSION_NODE_SERVICES_DEBT = [
  "src/node-services/paths.ts", // canonicalPath (realpathSync), sourceExists (statSync), OS user name
  "src/node-services/build/buildQueue.ts", // the render queue (its canonicalPath reads the disk)
  "src/node-services/linkedTargetWatch.ts", // fs.watch on frontmatter link targets
];

const { builtinModules } = require("node:module");

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
// The check cruises the transpiled copy of src/ (.js files at the same paths): match both.
const exactly = (files) => files.map((file) => `^${escape(file.replace(/\.ts$/u, ""))}\\.(ts|js)$`);
const builtins = (names) => `^(node:)?(${names.join("|")})$`;
const DOM_ONLY_PACKAGES = "(^|/node_modules/)(mermaid|@plantuml/core)(/|$)";
const HOSTS = "^src/(host-vscode|host-memory)/|^src/extension\\.(ts|js)$";

/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    // ----- vscode -----
    {
      name: "vscode-only-in-host-vscode",
      comment: "Only the VS Code host (src/host-vscode, src/extension.ts) may import vscode.",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/(host-vscode/|extension\\.(ts|js)$)" },
      // The editor provides vscode at run time; dependency-cruiser resolves it to @types/vscode.
      to: { path: "^vscode$|(^|/)node_modules/@types/vscode/" },
    },
    // ----- core -----
    {
      name: "core-is-the-bottom-layer",
      comment: "core imports only core (and npm packages): no ports, controllers, hosts or page.",
      severity: "error",
      from: { path: "^src/core/" },
      to: { path: "^src/", pathNot: "^src/core/" },
    },
    {
      name: "core-no-dom-packages",
      comment: "core runs in Node and in the page: no DOM-only package (Mermaid, PlantUML engine).",
      severity: "error",
      from: { path: "^src/core/" },
      to: { path: DOM_ONLY_PACKAGES },
    },
    {
      name: "core-no-node-builtins",
      comment: "core uses no Node built-in; file and process access go through host-api ports.",
      severity: "error",
      from: { path: "^src/core/", pathNot: exactly(Object.keys(NODE_DEBT)) },
      to: { dependencyTypes: ["core"] },
    },
    ...Object.entries(NODE_DEBT).map(([file, debt]) => ({
      name: "core-node-debt-is-bounded",
      comment:
        `${file} may keep only the built-ins it uses today (${debt.builtins.join(", ")}): ` +
        `${debt.reason}. Removal: ${debt.removal}.`,
      severity: "error",
      from: { path: exactly([file]) },
      to: { dependencyTypes: ["core"], pathNot: builtins(debt.builtins) },
    })),
    {
      name: "protocol-is-host-neutral",
      comment: "The message protocol is shared by the page and every host: core only, no npm, no Node.",
      severity: "error",
      from: { path: "^src/core/protocol/" },
      to: { pathNot: "^src/core/" },
    },
    // ----- host-api -----
    {
      name: "host-api-is-interfaces",
      comment: "Ports speak core types only: no vscode, Node, npm, controllers or implementations.",
      severity: "error",
      from: { path: "^src/host-api/" },
      to: { pathNot: "^src/(host-api|core)/" },
    },
    // ----- page -----
    {
      name: "page-not-to-host",
      comment: "The page is a browser bundle: it talks to its host through HostTransport only.",
      severity: "error",
      from: { path: "^src/page/" },
      to: { path: `^src/(host-api|session|node-services)/|${HOSTS}` },
    },
    {
      name: "page-no-node-builtins",
      comment: "The page runs in a webview: no Node built-in, directly or through the core it imports.",
      severity: "error",
      from: { path: "^src/page/" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "page-reaches-no-node-builtins",
      comment: "The core modules the page bundles must not reach a Node built-in either.",
      severity: "error",
      from: { path: "^src/page/" },
      to: { path: builtins(builtinModules.map(escape)), reachable: true },
    },
    // ----- node-services -----
    {
      name: "node-services-below-session",
      comment: "Node services implement ports: no controllers, page or hosts.",
      severity: "error",
      from: { path: "^src/node-services/" },
      to: { path: `^src/(session|page)/|${HOSTS}` },
    },
    // ----- session -----
    {
      name: "session-not-to-page-or-hosts",
      comment: "Controllers are host-neutral: no page code, no host (hosts create the session layer).",
      severity: "error",
      from: { path: "^src/session/" },
      to: { path: `^src/page/|${HOSTS}` },
    },
    {
      name: "session-node-builtins-path-only",
      comment: "The session layer reaches the disk through ports; only path arithmetic is allowed.",
      severity: "error",
      from: { path: "^src/session/" },
      to: { dependencyTypes: ["core"], pathNot: builtins(["path"]) },
    },
    {
      name: "session-node-services-debt",
      comment: "The session layer uses node-services only through ports, except the listed debt.",
      severity: "error",
      from: { path: "^src/session/" },
      to: { path: "^src/node-services/", pathNot: exactly(SESSION_NODE_SERVICES_DEBT) },
    },
    // ----- host-memory -----
    {
      name: "host-memory-is-a-thin-host",
      comment: "The in-memory host implements ports on core types only (it must run anywhere).",
      severity: "error",
      from: { path: "^src/host-memory/" },
      to: { pathNot: "^src/(host-memory|host-api|core)/" },
    },
    // ----- hosts -----
    {
      name: "host-vscode-not-to-page-or-other-hosts",
      comment: "The VS Code host loads the page as a built bundle, never its sources, nor another host.",
      severity: "error",
      from: { path: "^src/(host-vscode/|extension\\.(ts|js)$)" },
      to: { path: "^src/(page|host-memory)/" },
    },
    // ----- hygiene -----
    {
      name: "not-to-unresolvable",
      comment: "Every import resolves (vscode is provided by the editor at run time).",
      severity: "error",
      from: { path: "^src/" },
      to: { couldNotResolve: true, pathNot: "^vscode$" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    enhancedResolveOptions: {
      conditionNames: ["import", "require", "node", "default"],
      exportsFields: ["exports"],
      mainFields: ["module", "main", "types"],
    },
  },
};
