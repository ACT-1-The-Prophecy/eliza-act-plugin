import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { EnrichedTaskAssignedEvent } from "../../types";
import { EventProcessorService } from "../../blockchain/processors/event-processor.service";
import { TaskProcessingService } from "./task-processing.service";
import { WalletService } from "../../blockchain/services";
import { ethers } from "ethers";
import { ITopicHandler } from "../../types/ITopicHandler";

//Mediator between blockchain events and task processing
//Where task processing is topic handler
//where topic handler is a function that wrap custom action
export class EventManagerService {
  constructor(
    private eventProcessor: EventProcessorService,
    private taskProcessor: TaskProcessingService,
    private ethService: WalletService
  ) {
    elizaLogger.debug(
      `MARKETPLACE PLUGIN: ${EventManagerService.name} created`
    );
  }

  registerEventHandlers(
    publicKey: string,
    handlers: Map<string, ITopicHandler>,
    runtime: IAgentRuntime
  ): void {
    const eventTypes = ["AssignTaskByAgent", "AssignTaskByClient"];

    eventTypes.forEach((eventType) => {
      this.eventProcessor.registerHandler(eventType, async (event) => {
        if (event.agent_address?.toLowerCase() !== publicKey.toLowerCase()) {
          return true; // Not our task
        }
        const enrichedEvent = await this.enrichEvent(event);

        const handler = this.findHandlerForEvent(enrichedEvent, handlers);
        if (!handler) {
          elizaLogger.error(`No handler found for event ${event.topic}`);
          // await this.eventProcessor.markEventUnmatched(event);
          return false;
        }

        return this.taskProcessor.processTask(enrichedEvent, handler, runtime);
      });
    });
  }

  private findHandlerForEvent(
    event: EnrichedTaskAssignedEvent,
    handlers: Map<string, ITopicHandler>
  ): ITopicHandler | undefined {
    return handlers.get(event.topic);
  }

  private async enrichEvent(event: any): Promise<EnrichedTaskAssignedEvent> {
    const taskId = event.task_id;
    const taskState = await this.ethService.task(BigInt(taskId));

    return {
      taskId: BigInt(taskId),
      assignedAgent: taskState.assignedAgent,
      requestingAgent: taskState.owner,
      payload: taskState.payload,
      topic: ethers.decodeBytes32String(taskState.topic),
    };
  }
}
