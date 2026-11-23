/**
 * The one module of `src/core` and `src/session` that imports `node:path`. Every other file imports
 * path arithmetic from here, so a browser build aliases `node:path` to a path shim in this module
 * only. The shim must export `win32`, `posix`, `parse` and `sep`, as callers use them.
 */
import path = require("node:path");

export = path;
