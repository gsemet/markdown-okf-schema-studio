// Preload for Node-run code that imports the MyST engine: `node --import ./scripts/register-myst-patches.mjs`.
import { register } from "node:module";

register("./myst-patch-hooks.mjs", import.meta.url);
