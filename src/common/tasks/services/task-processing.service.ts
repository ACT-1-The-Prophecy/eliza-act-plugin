import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { TaskProcessingStatus } from "../../schema";
import { TaskSubmissionJob } from "../jobs";
import { StateStoreService } from "../../storage/services";
import { EnrichedTaskAssignedEvent, TopicHandlerResult } from "../../types";
import { ITopicHandler } from "../../types/ITopicHandler";

export class TaskProcessingService {
  constructor(
    private stateStore: StateStoreService,
    private taskSubmission: TaskSubmissionJob //STRANGE: why we have dependency on JOB here? CHANGE!
  ) {
    elizaLogger.debug(
      `MARKETPLACE PLUGIN: ${TaskProcessingService.name} created`
    );
  }

  async processTask(
    task: EnrichedTaskAssignedEvent,
    handler: ITopicHandler,
    runtime: IAgentRuntime
  ): Promise<boolean> {
    try {
      const taskIdStr = task.taskId.toString();

      await this.stateStore.updateTaskStatus(
        taskIdStr,
        TaskProcessingStatus.PROCESSING
      );

      const result: TopicHandlerResult = await handler.processTask(
        task,
        runtime
      );

      if (!result || result.success === false) {
        await this.stateStore.updateTaskStatus(
          taskIdStr,
          TaskProcessingStatus.FAILED,
          result?.error || "Processing failed"
        );
        return false;
      }

      await this.taskSubmission.queueResultForSubmission(
        taskIdStr,
        result.result
      );

      return true;
    } catch (error) {
      await this.stateStore.updateTaskStatus(
        task.taskId.toString(),
        TaskProcessingStatus.FAILED,
        error.message
      );
      return false;
    }
  }
}
