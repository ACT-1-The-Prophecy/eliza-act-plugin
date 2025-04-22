import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { EventProcessingStatus } from "../../schema";

//Store events from the blockchain
export class EventStore {
  private readonly DB_TABLE_CHAIN_EVENTS = "act_marketplace_events";
  private initialized = false;

  constructor(private readonly runtime: IAgentRuntime) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const db = this.runtime.databaseAdapter;

      await db.db.exec(`
                CREATE TABLE IF NOT EXISTS ${this.DB_TABLE_CHAIN_EVENTS} (
                  event_id TEXT PRIMARY KEY,
                  event_name TEXT NOT NULL,
                  block_number INTEGER NOT NULL,
                  transaction_index INTEGER NOT NULL,
                  log_index INTEGER NOT NULL,
                  transaction_hash TEXT NOT NULL,
                  task_id TEXT,
                  agent_address TEXT,
                  status TEXT NOT NULL,
                  processing_attempts INTEGER DEFAULT 0,
                  last_processing_attempt INTEGER,
                  error_message TEXT,
                  processed_at INTEGER,
                  payload TEXT,
                  topic TEXT
                );
                
                CREATE INDEX IF NOT EXISTS idx_events_status ON ${this.DB_TABLE_CHAIN_EVENTS}(status);
                CREATE INDEX IF NOT EXISTS idx_events_task_id ON ${this.DB_TABLE_CHAIN_EVENTS}(task_id);
                CREATE INDEX IF NOT EXISTS idx_events_agent_address ON ${this.DB_TABLE_CHAIN_EVENTS}(agent_address);
                CREATE INDEX IF NOT EXISTS idx_events_topic ON ${this.DB_TABLE_CHAIN_EVENTS}(topic);
            `);

      this.initialized = true;
    } catch (error) {
      elizaLogger.error("Failed to initialize event store:", error);
      throw error;
    }
  }

  async saveEvent(event: {
    eventId: string;
    eventName: string;
    blockNumber: number;
    transactionIndex: number;
    logIndex: number;
    transactionHash: string;
    taskId?: string;
    agentAddress?: string;
    status: EventProcessingStatus;
    payload?: string;
    topic?: string;
  }): Promise<void> {
    try {
      // Check if event already exists
      const existing = await this.runtime.databaseAdapter.db
        .prepare(
          `SELECT 1 FROM ${this.DB_TABLE_CHAIN_EVENTS} WHERE event_id = ?`
        )
        .get(event.eventId);

      if (existing) {
        return; // Event already exists
      }

      await this.runtime.databaseAdapter.db
        .prepare(
          `
                    INSERT INTO ${this.DB_TABLE_CHAIN_EVENTS} 
                    (event_id, event_name, block_number, transaction_index, log_index, 
                     transaction_hash, task_id, agent_address, status, 
                     processing_attempts, last_processing_attempt, payload, topic)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `
        )
        .run(
          event.eventId,
          event.eventName,
          event.blockNumber,
          event.transactionIndex,
          event.logIndex,
          event.transactionHash,
          event.taskId || null,
          event.agentAddress.toLowerCase() || null,
          event.status,
          0,
          null,
          event.payload || null,
          event.topic || null
        );
    } catch (error) {
      elizaLogger.error(`Failed to save event: ${error.message}`, error);
      throw error;
    }
  }

  async getUnprocessedEvents(
    agentAddress: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const events = await this.runtime.databaseAdapter.db
        .prepare(
          `
                    SELECT * FROM ${this.DB_TABLE_CHAIN_EVENTS} 
                    WHERE status = ? AND agent_address = ?
                    ORDER BY block_number ASC, transaction_index ASC, log_index ASC
                    LIMIT ?
                `
        )
        .all(
          EventProcessingStatus.UNPROCESSED,
          agentAddress.toLowerCase(),
          limit
        );

      return events;
    } catch (error) {
      elizaLogger.error(
        `Failed to get unprocessed events for agent ${agentAddress}: ${error.message}`,
        error
      );
      return [];
    }
  }

  async updateEventStatus(
    eventId: string,
    status: EventProcessingStatus,
    errorMessage?: string
  ): Promise<void> {
    try {
      const now = Date.now();
      const updates = {
        status,
        last_processing_attempt: now,
        error_message: errorMessage,
        processed_at: status === EventProcessingStatus.PROCESSED ? now : null,
      };

      const query = `
                UPDATE ${this.DB_TABLE_CHAIN_EVENTS}
                SET status = ?,
                    last_processing_attempt = ?,
                    error_message = ?,
                    processed_at = ?,
                    processing_attempts = processing_attempts + 1
                WHERE event_id = ?
            `;

      await this.runtime.databaseAdapter.db
        .prepare(query)
        .run(
          updates.status,
          updates.last_processing_attempt,
          updates.error_message,
          updates.processed_at,
          eventId
        );
    } catch (error) {
      elizaLogger.error(
        `Failed to update event status: ${error.message}`,
        error
      );
      throw error;
    }
  }

  async getEventById(eventId: string): Promise<any> {
    try {
      return await this.runtime.databaseAdapter.db
        .prepare(
          `SELECT * FROM ${this.DB_TABLE_CHAIN_EVENTS} WHERE event_id = ?`
        )
        .get(eventId);
    } catch (error) {
      elizaLogger.error(`Failed to get event by ID: ${error.message}`, error);
      return null;
    }
  }

  async getStuckEvents(
    agentAddress: string,
    timeoutMs: number = 5 * 60 * 1000
  ): Promise<any[]> {
    try {
      const cutoffTime = Date.now() - timeoutMs;
      return await this.runtime.databaseAdapter.db
        .prepare(
          `
                    SELECT * FROM ${this.DB_TABLE_CHAIN_EVENTS} 
                    WHERE status = ? AND agent_address = ? AND last_processing_attempt < ?
                    ORDER BY last_processing_attempt ASC
                `
        )
        .all(EventProcessingStatus.PROCESSING, agentAddress, cutoffTime);
    } catch (error) {
      elizaLogger.error(`Failed to get stuck events: ${error.message}`, error);
      return [];
    }
  }
}
