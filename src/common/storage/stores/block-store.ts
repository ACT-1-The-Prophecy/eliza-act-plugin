import { elizaLogger, IAgentRuntime } from "@elizaos/core";

export class BlockTrackerStore {
  private readonly DB_TABLE_BLOCKS = "act_marketplace_blocks";
  private initialized = false;

  constructor(private readonly runtime: IAgentRuntime) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const db = this.runtime.databaseAdapter;

      await db.db.exec(`
                CREATE TABLE IF NOT EXISTS ${this.DB_TABLE_BLOCKS} (
                    agent_address TEXT PRIMARY KEY,
                    last_processed_block INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );
            `);

      this.initialized = true;
    } catch (error) {
      elizaLogger.error("Failed to initialize block tracker store:", error);
      throw error;
    }
  }

  async getLastProcessedBlock(
    agentAddress: string,
    defaultBlock: number = 0
  ): Promise<number> {
    try {
      const result = await this.runtime.databaseAdapter.db
        .prepare(
          `SELECT last_processed_block FROM ${this.DB_TABLE_BLOCKS} WHERE agent_address = ?`
        )
        .get(agentAddress.toLowerCase());

      if (result) {
        return result.last_processed_block;
      }

      // If no record exists, insert the default block
      await this.saveLastProcessedBlock(agentAddress, defaultBlock);
      return defaultBlock;
    } catch (error) {
      elizaLogger.error(
        `Failed to get last processed block for ${agentAddress}:`,
        error
      );
      return defaultBlock;
    }
  }

  async saveLastProcessedBlock(
    agentAddress: string,
    blockNumber: number
  ): Promise<void> {
    try {
      await this.runtime.databaseAdapter.db
        .prepare(
          `
                    INSERT OR REPLACE INTO ${this.DB_TABLE_BLOCKS} 
                    (agent_address, last_processed_block, updated_at)
                    VALUES (?, ?, ?)
                `
        )
        .run(agentAddress.toLowerCase(), blockNumber, Date.now());
    } catch (error) {
      elizaLogger.error(
        `Failed to save last processed block for ${agentAddress}:`,
        error
      );
      throw error;
    }
  }
}
