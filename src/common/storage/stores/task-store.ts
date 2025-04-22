import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { TaskProcessingStatus } from "../../schema";

export class TaskStore {
    private readonly DB_TABLE_TASK_RESULTS = "act_marketplace_task_results";
    private initialized = false;
    constructor(private readonly runtime: IAgentRuntime) {}

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            const db = this.runtime.databaseAdapter;

            await db.db.exec(`
                CREATE TABLE IF NOT EXISTS ${this.DB_TABLE_TASK_RESULTS} (
                  task_id TEXT PRIMARY KEY,
                  event_id TEXT,
                  result TEXT NOT NULL,
                  status TEXT NOT NULL,
                  created_at INTEGER NOT NULL,
                  updated_at INTEGER NOT NULL,
                  agent_address TEXT NOT NULL,
                  error_message TEXT,
                  tx_hash TEXT,
                  retry_count INTEGER DEFAULT 0
                );
                
                CREATE INDEX IF NOT EXISTS idx_task_results_status ON ${this.DB_TABLE_TASK_RESULTS}(status);
                CREATE INDEX IF NOT EXISTS idx_task_results_event_id ON ${this.DB_TABLE_TASK_RESULTS}(event_id);
            `);

            this.initialized = true;
        } catch (error) {
            elizaLogger.error("Failed to initialize task store:", error);
            throw error;
        }
    }

    async updateTaskResult(
        taskId: string,
        result: string,
        status: TaskProcessingStatus,
        agentAddress: string,
        eventId?: string
    ): Promise<void> {
        try {
            const now = Date.now();

            const existing = await this.runtime.databaseAdapter.db
                .prepare(
                    `SELECT 1 FROM ${this.DB_TABLE_TASK_RESULTS} WHERE task_id = ?`
                )
                .get(taskId);

            if (existing) {
                await this.runtime.databaseAdapter.db
                    .prepare(
                        `
                        UPDATE ${this.DB_TABLE_TASK_RESULTS}
                        SET result = ?, status = ?, updated_at = ?
                        WHERE task_id = ?
                    `
                    )
                    .run(result, status, now, taskId);
            } else {
                await this.runtime.databaseAdapter.db
                    .prepare(
                        `
                        INSERT INTO ${this.DB_TABLE_TASK_RESULTS}
                        (task_id, event_id, result, status, created_at, updated_at, agent_address)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `
                    )
                    .run(
                        taskId,
                        eventId || null,
                        result,
                        status,
                        now,
                        now,
                        agentAddress
                    );
            }
        } catch (error) {
            elizaLogger.error(
                `Failed to update task result: ${error.message}`,
                error
            );
            throw error;
        }
    }

    async updateTaskStatus(
        taskId: string,
        status: TaskProcessingStatus,
        txHashOrError?: string
    ): Promise<void> {
        try {
            const now = Date.now();

            // Create properly typed array
            const params: (string | number | TaskProcessingStatus)[] = [
                status,
                now,
            ];

            // Build query dynamically
            let query = `
                UPDATE ${this.DB_TABLE_TASK_RESULTS} 
                SET status = ?, updated_at = ?
            `;

            if (status === TaskProcessingStatus.SUBMITTED) {
                query += `, tx_hash = ?`;
                params.push(txHashOrError as string);
            } else if (status === TaskProcessingStatus.FAILED) {
                query += `, error_message = ?`;
                params.push(txHashOrError as string);
            }

            query += ` WHERE task_id = ?`;
            params.push(taskId);

            await this.runtime.databaseAdapter.db.prepare(query).run(...params);
        } catch (error) {
            elizaLogger.error(
                `Failed to update task status: ${error.message}`,
                error
            );
            throw error;
        }
    }

    async getTasksReadyForSubmission(
        limit: number = 10,
        agentAddress: string
    ): Promise<any[]> {
        try {
            return await this.runtime.databaseAdapter.db
                .prepare(
                    `
                    SELECT * FROM ${this.DB_TABLE_TASK_RESULTS} 
                    WHERE status = ? AND agent_address = ?
                    ORDER BY created_at ASC
                    LIMIT ?
                `
                )
                .all(
                    TaskProcessingStatus.READY_FOR_SUBMISSION,
                    agentAddress,
                    limit
                );
        } catch (error) {
            elizaLogger.error(
                `Failed to get tasks ready for submission: ${error.message}`,
                error
            );
            return [];
        }
    }

    async getFailedTasksForRetry(
        maxRetries: number = 3,
        agentAddress: string
    ): Promise<any[]> {
        try {
            return await this.runtime.databaseAdapter.db
                .prepare(
                    `
                    SELECT * FROM ${this.DB_TABLE_TASK_RESULTS} 
                    WHERE status = ? 
                    AND (retry_count IS NULL OR retry_count < ?)
                    AND agent_address = ?
                    ORDER BY updated_at ASC
                `
                )
                .all(TaskProcessingStatus.FAILED, maxRetries, agentAddress);
        } catch (error) {
            elizaLogger.error(
                `Failed to get tasks for retry: ${error.message}`,
                error
            );
            return [];
        }
    }

    async incrementTaskRetry(
        taskId: string,
        status: TaskProcessingStatus,
        errorMessage?: string
    ): Promise<void> {
        try {
            const now = Date.now();

            const params: (string | number | TaskProcessingStatus)[] = [
                status,
                now,
            ];

            let query = `
                UPDATE ${this.DB_TABLE_TASK_RESULTS} 
                SET status = ?, 
                    updated_at = ?, 
                    retry_count = COALESCE(retry_count, 0) + 1
            `;

            if (errorMessage) {
                query += `, error_message = ?`;
                params.push(errorMessage);
            }

            query += ` WHERE task_id = ?`;
            params.push(taskId);

            await this.runtime.databaseAdapter.db.prepare(query).run(...params);
        } catch (error) {
            elizaLogger.error(
                `Failed to increment task retry: ${error.message}`,
                error
            );
            throw error;
        }
    }

    async getStuckTasks(
        timeoutMs: number = 10 * 60 * 1000,
        agentAddress: string
    ): Promise<any[]> {
        try {
            const cutoffTime = Date.now() - timeoutMs;
            return await this.runtime.databaseAdapter.db
                .prepare(
                    `
                    SELECT * FROM ${this.DB_TABLE_TASK_RESULTS} 
                    WHERE status = ? AND updated_at < ? AND agent_address = ?
                    ORDER BY updated_at ASC
                `
                )
                .all(TaskProcessingStatus.PROCESSING, cutoffTime, agentAddress);
        } catch (error) {
            elizaLogger.error(
                `Failed to get stuck tasks: ${error.message}`,
                error
            );
            return [];
        }
    }
}
