import { elizaLogger } from "@elizaos/core";
import { BaseJob } from "./base-job";
import { BlockTrackerService } from "../../blockchain/services";
import { ApiService } from "../../core";

export class AgentHeartbeatJob extends BaseJob {
  constructor(
    private readonly actApi: ApiService,
    private readonly blockTracker: BlockTrackerService,
    private readonly publicKey: string,
    private readonly instanceId: string = `agent-${Date.now()}`,
    checkIntervalMs: number = 6 * 1000 // 1 minute default
  ) {
    super("Agent heartbeat service", checkIntervalMs);
    elizaLogger.debug(`MARKETPLACE PLUGIN: ${AgentHeartbeatJob.name} created`);
  }

  protected async executeCycle(): Promise<void> {
    try {
      const marketApiClient = this.actApi.getMarketApiClient();

      if (!marketApiClient) {
        elizaLogger.warn("Market API client not available for heartbeat");
        return;
      }

      const lastProcessedBlock = this.blockTracker.getLastProcessedBlock();

      elizaLogger.debug(
        `Sending heartbeat for agent ${this.publicKey} at block ${lastProcessedBlock}`
      );

      await marketApiClient.updateLastOnline(
        this.publicKey,
        lastProcessedBlock,
        this.instanceId
      );

      elizaLogger.debug("Agent heartbeat successfully sent");
    } catch (error) {
      elizaLogger.error(
        `Error sending agent heartbeat: ${error.message}`,
        error
      );
    }
  }
}
