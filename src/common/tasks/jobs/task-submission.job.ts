import { elizaLogger } from "@elizaos/core";
import { WalletService } from "../../blockchain/services";
import { TaskProcessingStatus, EventProcessingStatus } from "../../schema";
import { StateStoreService } from "../../storage/services";
import { BaseJob } from "./base-job";
import { TaskState } from "../../blockchain/contract/dist";

export class TaskSubmissionJob extends BaseJob {
  constructor(
    private readonly stateStore: StateStoreService,
    private readonly ethService: WalletService,
    private readonly publicKey: string,
    private readonly privateKey: string,
    checkIntervalMs: number = 20 * 1000
  ) {
    super("Task submission service", checkIntervalMs);
    elizaLogger.debug(`MARKETPLACE PLUGIN: ${TaskSubmissionJob.name}  created`);
  }

  public async queueResultForSubmission(
    taskId: string,
    result: any
  ): Promise<void> {
    try {
      const resultStr =
        typeof result === "string" ? result : JSON.stringify(result);
      await this.stateStore.updateTaskResult(
        taskId,
        resultStr,
        TaskProcessingStatus.READY_FOR_SUBMISSION,
        this.publicKey
      );
      elizaLogger.info(`Queued task ${taskId} for result submission`);
    } catch (error) {
      elizaLogger.error(
        `Failed to queue task ${taskId} for submission:`,
        error
      );
    }
  }

  protected async executeCycle(): Promise<void> {
    elizaLogger.debug(`Starting ${TaskSubmissionJob.name} cycle`);

    const tasksToSubmit = await this.stateStore.getTasksReadyForSubmission();

    if (tasksToSubmit.length === 0) {
      return;
    }

    elizaLogger.info(
      `Found ${tasksToSubmit.length} completed tasks to submit to blockchain`
    );

    for (const task of tasksToSubmit) {
      try {
        elizaLogger.debug(
          `Attempting to submit task ${task.task_id} to blockchain`
        );
        const taskState = await this.ethService
          .getContract()
          .tasks(BigInt(task.task_id));

        if (Number(taskState.state) !== Number(TaskState.ASSIGNED)) {
          elizaLogger.debug(`taskID:${task.task_id} have not ASSIGNED STATE`);
          await this.stateStore.updateTaskStatus(
            task.task_id,
            TaskProcessingStatus.FAILED,
            "Task no longer in assigned state"
          );
          continue;
        }

        // Mark as submitting
        await this.stateStore.updateTaskStatus(
          task.task_id,
          TaskProcessingStatus.SUBMITTING
        );

        // Submit to blockchain
        if (typeof task.result === "string") {
          try {
            task.result = JSON.parse(task.result);
          } catch (error) {
            elizaLogger.error(
              `Failed to parse task result for task ${task.task_id}: ${error.message}`
            );
            await this.stateStore.updateTaskStatus(
              task.task_id,
              TaskProcessingStatus.FAILED,
              "Invalid JSON format in task result"
            );
            continue;
          }
        }

        const tx = await this.ethService.submitTaskResult(
          this.publicKey,
          BigInt(task.task_id),
          task.result.url,
          this.privateKey
        );

        elizaLogger.debug(
          `Transaction created: ${tx.hash}, waiting for confirmation`
        );
        await tx.wait();

        // Mark as submitted
        await this.stateStore.updateTaskStatus(
          task.task_id,
          TaskProcessingStatus.SUBMITTED,
          tx.hash
        );

        // Mark corresponding event as processed
        if (task.event_id) {
          await this.stateStore.updateEventStatus(
            task.event_id,
            EventProcessingStatus.PROCESSED
          );
        }

        elizaLogger.success(
          `Task ${task.task_id} result submitted (tx: ${tx.hash})`
        );
      } catch (error) {
        await this.stateStore.updateTaskStatus(
          task.task_id,
          TaskProcessingStatus.FAILED,
          error.message
        );
        elizaLogger.error(
          `Error submitting task ${task.task_id}: ${error.message}`
        );
      }
    }
  }
}
