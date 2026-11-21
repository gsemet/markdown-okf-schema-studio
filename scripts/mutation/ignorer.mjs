/**
 * Stryker ignorer plugin `mdokf-messages` (CR-450, mt-Q3): mutants that change only a log call or
 * a user-facing message are ignored (reported as Ignored with the reason), so no test is asked to
 * pin message wording. No `// Stryker disable` comment is ever added to `src/`.
 *
 * Rule list (a node that matches ignores its whole subtree):
 *  1. A call whose callee is `console.<x>`, `logger.<x>` or `log.<x>`: every mutant inside it.
 *  2. A `new Error(...)`, `new TypeError(...)` or any `new <Name>Error(...)`: every mutant inside it
 *     (the message argument of a thrown error).
 *  3. An object property named `message`, `detail`, `title`, `label`, `description`, `tooltip` or
 *     `placeholder` whose value is a string literal or a template literal: the property (this
 *     covers the diagnostic messages the code returns, which carry a `message`).
 * Not ignored: strings that drive behaviour (syntax tokens, keys, regular expressions, protocol
 * message types, setting names), and any property above whose value is not a plain string.
 */
import { PluginKind, declareValuePlugin } from "@stryker-mutator/api/plugin";

export const LOGGER_NAMES = new Set(["console", "logger", "log"]);
export const MESSAGE_PROPERTIES = new Set(["message", "detail", "title", "label", "description", "tooltip", "placeholder"]);

/** The rule that ignores `node` (a Babel node), or undefined. Pure: takes the node only. */
export function ignoreReason(node) {
  if (!node) return undefined;
  if (node.type === "CallExpression" || node.type === "OptionalCallExpression") {
    const callee = node.callee;
    if (
      (callee?.type === "MemberExpression" || callee?.type === "OptionalMemberExpression") &&
      callee.object?.type === "Identifier" &&
      LOGGER_NAMES.has(callee.object.name)
    ) {
      return `log call (${callee.object.name}.*)`;
    }
  }
  if (node.type === "NewExpression" && node.callee?.type === "Identifier" && /Error$/u.test(node.callee.name)) {
    return `thrown error message (new ${node.callee.name})`;
  }
  if (node.type === "ObjectProperty" && !node.computed) {
    const key = node.key?.type === "Identifier" ? node.key.name : node.key?.type === "StringLiteral" ? node.key.value : undefined;
    if (key !== undefined && MESSAGE_PROPERTIES.has(key) && (node.value?.type === "StringLiteral" || node.value?.type === "TemplateLiteral")) {
      return `user-facing message (${key} property)`;
    }
  }
  return undefined;
}

export const strykerPlugins = [declareValuePlugin(PluginKind.Ignore, "mdokf-messages", { shouldIgnore: (path) => ignoreReason(path.node) })];
