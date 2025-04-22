import { elizaLogger } from "@elizaos/core";
import { TrackerConfig } from "../../types";
import { StateStoreService } from "../../storage/services";

export class BlockTrackerService {
  private lastProcessedBlock = 0;
  private isProcessingHistorical = false;
  private agentPublicKey: string;

  constructor(
    private readonly config: TrackerConfig,
    private readonly stateStore: StateStoreService,
    publicKey: string
  ) {
    this.agentPublicKey = publicKey.toLowerCase();
    elizaLogger.debug(
      `MARKETPLACE PLUGIN: ${BlockTrackerService.name} created`
    );
  }

  async initialize(): Promise<void> {
    await this.stateStore.initialize();
    this.lastProcessedBlock = await this.loadLastProcessedBlock();
    elizaLogger.info(
      `Initialized block tracker at block ${this.lastProcessedBlock}`
    );
  }

  async loadLastProcessedBlock(): Promise<number> {
    try {
      // First check the database for stored value
      const storedBlock = await this.stateStore.getLastProcessedBlock(
        this.agentPublicKey,
        this.config.contractDeploymentBlock
      );

      // If there's a stored value, use it
      if (storedBlock > 0) {
        return storedBlock;
      }

      // Otherwise, use the config value
      return Math.max(
        this.config.lastProcessedBlock || 0,
        this.config.contractDeploymentBlock || 0
      );
    } catch (error) {
      elizaLogger.error("Failed to load last processed block:", error);
      return this.config.contractDeploymentBlock || 0;
    }
  }

  async saveLastProcessedBlock(blockNumber: number): Promise<void> {
    try {
      if (blockNumber > this.lastProcessedBlock) {
        await this.stateStore.saveLastProcessedBlock(
          this.agentPublicKey,
          blockNumber
        );
        this.lastProcessedBlock = blockNumber;
        elizaLogger.debug(`Saved last processed block: ${blockNumber}`);
      }
    } catch (error) {
      elizaLogger.error("Failed to save last processed block:", error);
    }
  }

  setProcessingHistorical(value: boolean): void {
    this.isProcessingHistorical = value;
  }

  isHistoricalProcessing(): boolean {
    return this.isProcessingHistorical;
  }

  getLastProcessedBlock(): number {
    return this.lastProcessedBlock;
  }

  shouldProcessBlock(blockNumber: number): boolean {
    return (
      !this.isProcessingHistorical && blockNumber > this.lastProcessedBlock
    );
  }
}
