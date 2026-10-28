/** The Node implementations of the path, render-queue and linked-target ports, for session fixtures. */

import { nodeRenderQueues } from "../../src/node-services/build/buildQueue";
import { nodeLinkedTargetWatcher } from "../../src/node-services/linkedTargetWatch";
import { nodeHostPaths } from "../../src/node-services/paths";

export const nodeHostPorts = {
  paths: nodeHostPaths,
  renderQueues: nodeRenderQueues,
  linkedTargets: nodeLinkedTargetWatcher,
};
