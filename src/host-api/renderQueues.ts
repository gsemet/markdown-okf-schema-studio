/**
 * The `RenderQueues` port: creates the render queue of a preview. The queue itself is host-neutral
 * (`src/core/render/buildQueue.ts`); the host supplies how it compares paths (the canonical form
 * on its disk).
 */

import type { BuildQueue, BuildQueueOptions, QueueDocument } from "../core/render/buildQueue";

export interface RenderQueues {
  create<TDocument extends QueueDocument, TResult>(
    options: Omit<BuildQueueOptions<TDocument, TResult>, "canonicalize">,
  ): BuildQueue<TDocument, TResult>;
}
