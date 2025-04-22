import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { TaskProcessingStatus } from "../../schema";
import { StateStoreService } from "../../storage/services";
import { BaseJob } from "./base-job";

//Retry failed tasks
//I(agent) have completed some task, but it failed during submitting, so I need to retry submit
//I have a map of topic to processor, so I can retry it
export class TopicTaskRetryJob extends BaseJob {
    private maxRetries = 3;
    private retryDelayMs = 5 * 60 * 1000; // 5 minutes

    constructor(
        private readonly stateStore: StateStoreService,
        private readonly topicProcessors: Map<
            string,
            (task: any) => Promise<any>
        >,
        checkIntervalMs: number = 10 * 60 * 1000 // 10 minutes
    ) {
        super("Task retry service", checkIntervalMs);
        elizaLogger.debug(
            `MARKETPLACE PLUGIN: ${TopicTaskRetryJob.name}  created`
        );
    }

    protected async executeCycle(): Promise<void> {
        // Get failed tasks with retry count < max
        const failedTasks = await this.stateStore.getFailedTasksForRetry(
            this.maxRetries
        );

        if (failedTasks.length === 0) {
            return;
        }

        elizaLogger.info(`Found ${failedTasks.length} failed tasks to retry`);

        // Process each task
        for (const task of failedTasks) {
            try {
                // Check if enough time has passed since last attempt
                const lastAttempt = task.updated_at || 0;
                const now = Date.now();

                if (now - lastAttempt < this.retryDelayMs) {
                    continue; // Skip if not enough time has passed
                }

                // Mark as processing
                await this.stateStore.updateTaskStatus(
                    task.task_id,
                    TaskProcessingStatus.PROCESSING
                );

                // Look up the original event
                const event = await this.stateStore.getEventById(task.event_id);

                if (!event) {
                    elizaLogger.warn(
                        `Could not find original event for task ${task.task_id}`
                    );
                    continue;
                }

                // Dispatch to appropriate processor based on topic
                const topic = event.topic || "unknown";
                const processor = this.topicProcessors.get(topic);

                if (!processor) {
                    elizaLogger.warn(`No processor for topic ${topic}`);
                    continue;
                }

                // Retry processing
                elizaLogger.info(
                    `Retrying task ${task.task_id} (attempt ${
                        task.retry_count + 1
                    }/${this.maxRetries})`
                );
                const result = await processor(event);

                if (result && result.success) {
                    await this.stateStore.updateTaskStatus(
                        task.task_id,
                        TaskProcessingStatus.READY_FOR_SUBMISSION
                    );
                    elizaLogger.info(`Task ${task.task_id} retry successful`);
                } else {
                    const error = result?.error || "Unknown error during retry";
                    await this.stateStore.incrementTaskRetry(
                        task.task_id,
                        TaskProcessingStatus.FAILED,
                        error
                    );
                    elizaLogger.warn(
                        `Task ${task.task_id} retry failed: ${error}`
                    );
                }
            } catch (error) {
                elizaLogger.error(
                    `Error retrying task ${task.task_id}: ${error.message}`
                );
                await this.stateStore.incrementTaskRetry(
                    task.task_id,
                    TaskProcessingStatus.FAILED,
                    error.message
                );
            }
        }
    }
}
