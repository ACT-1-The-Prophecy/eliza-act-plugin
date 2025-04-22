import { elizaLogger } from "@elizaos/core";
import { EventProcessorService } from "../../blockchain/processors";
import { EventProcessingStatus, TaskProcessingStatus } from "../../schema";
import { StateStoreService } from "../../storage/services";
import { BaseJob } from "./base-job";

//Process events from the state store with EventProcessorService logic
export class EventProcessorJob extends BaseJob {
    constructor(
        private readonly eventProcessor: EventProcessorService,
        private readonly stateStore: StateStoreService,
        eventCheckIntervalMs: number = 10 * 1000, // 10 seconds
        private readonly stuckEventsCheckIntervalMs: number = 15 * 60 * 1000, // 15 minutes
        private readonly stuckTasksCheckIntervalMs: number = 20 * 60 * 1000 // 20 minutes
    ) {
        super("Event Processor Job", eventCheckIntervalMs);
        elizaLogger.debug(
            `MARKETPLACE PLUGIN: ${EventProcessorJob.name}  created`
        );
    }

    protected async executeCycle(): Promise<void> {
        try {
            await this.eventProcessor.processEvents();

            const now = Date.now();
            const lastStuckEventsCheck = this.getLastCheckTime("stuckEvents");
            const lastStuckTasksCheck = this.getLastCheckTime("stuckTasks");

            if (now - lastStuckEventsCheck >= this.stuckEventsCheckIntervalMs) {
                await this.recoverStuckEvents();
                this.updateLastCheckTime("stuckEvents", now);
            }

            if (now - lastStuckTasksCheck >= this.stuckTasksCheckIntervalMs) {
                await this.recoverStuckTasks();
                this.updateLastCheckTime("stuckTasks", now);
            }
        } catch (error) {
            elizaLogger.error(
                `Error in event processor job: ${error.message}`,
                error
            );
        }
    }

    private async recoverStuckEvents(): Promise<void> {
        try {
            const stuckEvents = await this.stateStore.getStuckEvents();

            if (stuckEvents.length > 0) {
                elizaLogger.warn(
                    `Found ${stuckEvents.length} stuck events to recover`
                );

                for (const event of stuckEvents) {
                    elizaLogger.warn(
                        `Recovering stuck event ${event.event_id}`
                    );
                    await this.stateStore.updateEventStatus(
                        event.event_id,
                        EventProcessingStatus.FAILED,
                        "Event processing timed out"
                    );
                }
            }
        } catch (error) {
            elizaLogger.error(
                `Error recovering stuck events: ${error.message}`,
                error
            );
        }
    }

    private async recoverStuckTasks(): Promise<void> {
        try {
            const stuckTasks = await this.stateStore.getStuckTasks();

            if (stuckTasks.length > 0) {
                elizaLogger.warn(
                    `Found ${stuckTasks.length} stuck tasks to recover`
                );

                for (const task of stuckTasks) {
                    elizaLogger.warn(`Recovering stuck task ${task.task_id}`);
                    await this.stateStore.updateTaskStatus(
                        task.task_id,
                        TaskProcessingStatus.FAILED,
                        "Task processing timed out"
                    );
                }
            }
        } catch (error) {
            elizaLogger.error(
                `Error recovering stuck tasks: ${error.message}`,
                error
            );
        }
    }

    private lastCheckTimes: Record<string, number> = {
        stuckEvents: 0,
        stuckTasks: 0,
    };

    private getLastCheckTime(type: "stuckEvents" | "stuckTasks"): number {
        return this.lastCheckTimes[type];
    }

    private updateLastCheckTime(
        type: "stuckEvents" | "stuckTasks",
        time: number
    ): void {
        this.lastCheckTimes[type] = time;
    }
}
