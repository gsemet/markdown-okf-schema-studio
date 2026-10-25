import { releaseSchemaValidators } from "./schemaValidator";

/**
 * A check that re-reads one input of a resolved schema (the schema file, an inlined `$ref` target,
 * or a probed `$ref` path) and reports whether it is still exactly what the entry was built from.
 */
export type SchemaDependencyCheck = () => boolean;

interface RegistryEntry {
  schema: Record<string, unknown>;
  dependencies: SchemaDependencyCheck[];
}

const entries = new Map<string, RegistryEntry>();
// Entries for schemas that were deleted or renamed are never re-resolved, so cap the registry.
const MAX_ENTRIES = 64;

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-027
/**
 * Returns the same resolved schema object while every input it was built from is unchanged, so the
 * compiled-validator caches keyed by that object keep hitting. Inputs are compared by content, not
 * mtime, so an edit is never missed on coarse-mtime filesystems. A changed entry is released from
 * the shared Ajv instance before being rebuilt.
 */
export function getResolvedSchema(
  key: string,
  build: (dependencies: SchemaDependencyCheck[]) => Record<string, unknown>,
): Record<string, unknown> {
  const cached = entries.get(key);
  if (cached) {
    if (cached.dependencies.every((check) => check())) {
      return cached.schema;
    }
    entries.delete(key);
    releaseSchemaValidators(cached.schema);
  }
  const dependencies: SchemaDependencyCheck[] = [];
  const schema = build(dependencies);
  entries.set(key, { schema, dependencies });
  if (entries.size > MAX_ENTRIES) {
    const [oldestKey, oldest] = entries.entries().next().value as [string, RegistryEntry];
    entries.delete(oldestKey);
    releaseSchemaValidators(oldest.schema);
  }
  return schema;
}

export function resetSchemaRegistryForTests(): void {
  for (const entry of entries.values()) {
    releaseSchemaValidators(entry.schema);
  }
  entries.clear();
}
