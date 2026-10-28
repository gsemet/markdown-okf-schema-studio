import {
  BuildQueue as CoreBuildQueue,
  type BuildQueueOptions,
  type QueueDocument,
} from "../../core/render/buildQueue";
import type { RenderQueues } from "../../host-api/renderQueues";
import { canonicalPath } from "../paths";

export type {
  BuildPhase,
  BuildQueueOptions,
  BuildQueueOutcome,
  BuildQueueState,
  BuildRequest,
  QueueDocument,
} from "../../core/render/buildQueue";

/**
 * The render queue of the Node hosts: the host-neutral queue (`src/core/render/buildQueue.ts`)
 * comparing paths in their canonical form on the disk (symbolic links resolved).
 */
export class BuildQueue<TDocument extends QueueDocument, TResult> extends CoreBuildQueue<TDocument, TResult> {
  public constructor(options: BuildQueueOptions<TDocument, TResult>) {
    super({ canonicalize: canonicalPath, ...options });
  }
}

/** The render queues of a Node host, as the `RenderQueues` port. */
export const nodeRenderQueues: RenderQueues = {
  create: (options) => new BuildQueue(options),
};
