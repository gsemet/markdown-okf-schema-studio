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

export function getCachedValidator(schema: object): ValidateFunction {
  const cached = validatorCache.get(schema);
  if (cached) return cached;
  const compiled = sharedSchemaValidator.compile(schema as never);
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
  const compiled = sharedSchemaValidator.compile(expandedBranch as never);
  validatorsByRoot.set(rootSchema, compiled);
  return compiled;
}

export function validateWithCachedValidator(schema: unknown, value: unknown): boolean {
  if (schema === true) return true;
  if (schema === false || !schema || typeof schema !== "object") return false;
  return getCachedValidator(schema)(value) === true;
}
