/**
 * The {@link SchemaFiles} port on Node's synchronous `fs`: the schema discovery of the frontmatter
 * analysis in every host that runs the core in Node.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type { SchemaFiles } from "../core/frontmatter/schemaFiles";

function isDirectory(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

function isFile(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function listFiles(dir: string): string[] {
  try {
    return fs.readdirSync(dir).filter((name) => {
      try {
        return fs.statSync(path.join(dir, name)).isFile();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

/** Schema files on the local disk. */
export const nodeSchemaFiles: SchemaFiles = {
  isDirectory,
  isFile,
  listFiles,
  readText: (schemaPath) => fs.readFileSync(schemaPath, "utf8"),
};
