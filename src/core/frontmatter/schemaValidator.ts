import Draft202012Validator from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { ValidateFunction } from "ajv";

export const sharedSchemaValidator = new Draft202012Validator({
  allErrors: true,
  addUsedSchema: false,
  strict: false,
});
addFormats(sharedSchemaValidator as never);
sharedSchemaValidator.addKeyword({ keyword: "x-okf-link", valid: true });

const validatorCache = new WeakMap<object, ValidateFunction>();
const branchValidatorCache = new WeakMap<object, WeakMap<object, ValidateFunction>>();
// Expanded branch schemas compiled for a resolved root, so they can be released with it.
const expandedBranchesByRoot = new WeakMap<object, object[]>();

// A failed compile leaves a half-built entry in Ajv's cache; a retry on the same (now stable)
// schema object would report a different error, so forget it and let every attempt fail alike.
function compileOrForget(schema: unknown): ValidateFunction {
  try {
    return sharedSchemaValidator.compile(schema as never);
  } catch (error) {
    if (schema && typeof schema === "object") sharedSchemaValidator.removeSchema(schema);
    throw error;
  }
}

export function getCachedValidator(schema: object): ValidateFunction {
  const cached = validatorCache.get(schema);
  if (cached) return cached;
  const compiled = compileOrForget(schema);
  validatorCache.set(schema, compiled);
  return compiled;
}

export function getCachedBranchValidator(
  branch: object,
  rootSchema: object,
  expandedBranch: unknown,
): ValidateFunction {
  let validatorsByRoot = branchValidatorCache.get(branch);
  if (!validatorsByRoot) {
    validatorsByRoot = new WeakMap<object, ValidateFunction>();
    branchValidatorCache.set(branch, validatorsByRoot);
  }
  const cached = validatorsByRoot.get(rootSchema);
  if (cached) return cached;
  const compiled = compileOrForget(expandedBranch);
  validatorsByRoot.set(rootSchema, compiled);
  if (expandedBranch && typeof expandedBranch === "object") {
    const expanded = expandedBranchesByRoot.get(rootSchema) ?? [];
    expanded.push(expandedBranch);
    expandedBranchesByRoot.set(rootSchema, expanded);
  }
  return compiled;
}

export function validateWithCachedValidator(schema: unknown, value: unknown): boolean {
  if (schema === true) return true;
  if (schema === false || !schema || typeof schema !== "object") return false;
  return getCachedValidator(schema)(value) === true;
}

/**
 * Drops every compiled validator that belongs to a resolved schema (the root, its sub-schemas such
 * as `if`, and expanded branches) from Ajv's strong-reference cache so they can be collected.
 */
export function releaseSchemaValidators(root: object): void {
  // Only objects that were actually compiled are removed: Ajv's removeSchema reads `$id` from its
  // argument, which would throw or unregister unrelated ids on arbitrary nested nodes.
  const forget = (node: object): void => {
    try {
      sharedSchemaValidator.removeSchema(node);
    } catch {
      // Best effort: a schema Ajv cannot unregister is still dropped from our own caches.
    }
  };
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (validatorCache.has(node)) {
      forget(node);
      validatorCache.delete(node);
    }
    for (const child of Object.values(node)) visit(child);
  };
  visit(root);
  for (const expanded of expandedBranchesByRoot.get(root) ?? []) forget(expanded);
  expandedBranchesByRoot.delete(root);
}

export function schemaValidatorCacheSizeForTests(): number {
  return (sharedSchemaValidator as unknown as { _cache: Map<unknown, unknown> })._cache.size;
}
