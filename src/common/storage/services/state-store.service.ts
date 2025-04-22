import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { EventProcessingStatus, TaskProcessingStatus } from "../../schema";
import { BlockTrackerStore } from "../stores/block-store";
import { EventStore } from "../stores/event-store";
import { TaskStore } from "../stores/task-store";

export class StateStoreService {
  private blockStore: BlockTrackerStore;
  private eventStore: EventStore;
  private taskStore: TaskStore;
  private initialized = false;
  private agentAddress: string;

  constructor(runtime: IAgentRuntime) {
    this.agentAddress = runtime.getSetting("PUBLIC_KEY");
    this.blockStore = new BlockTrackerStore(runtime);
    this.eventStore = new EventStore(runtime);
    this.taskStore = new TaskStore(runtime);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.blockStore.initialize();
    await this.eventStore.initialize();
    await this.taskStore.initialize();

    this.initialized = true;
    elizaLogger.info("State store initialized successfully");
  }

  async getLastProcessedBlock(
    agentAddress: string,
    defaultBlock: number = 0
  ): Promise<number> {
    return this.blockStore.getLastProcessedBlock(agentAddress, defaultBlock);
  }

  async saveLastProcessedBlock(
    agentAddress: string,
    blockNumber: number
  ): Promise<void> {
    return this.blockStore.saveLastProcessedBlock(agentAddress, blockNumber);
  }

  async saveEvent(event: any): Promise<void> {
    return this.eventStore.saveEvent(event);
  }

  async getUnprocessedEvents(limit: number = 50): Promise<any[]> {
    return this.eventStore.getUnprocessedEvents(this.agentAddress, limit);
  }

  async getStuckEvents(timeoutMs: number = 5 * 60 * 1000): Promise<any[]> {
    return this.eventStore.getStuckEvents(this.agentAddress, timeoutMs);
  }

  async updateEventStatus(
    eventId: string,
    status: EventProcessingStatus,
    errorMessage?: string
  ): Promise<void> {
    return this.eventStore.updateEventStatus(eventId, status, errorMessage);
  }

  async getEventById(eventId: string): Promise<any> {
    return this.eventStore.getEventById(eventId);
  }

  async updateTaskResult(
    taskId: string,
    result: string,
    status: TaskProcessingStatus,
    agentAddress: string,
    eventId?: string
  ): Promise<void> {
    return this.taskStore.updateTaskResult(
      taskId,
      result,
      status,
      agentAddress,
      eventId
    );
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskProcessingStatus,
    txHashOrError?: string
  ): Promise<void> {
    return this.taskStore.updateTaskStatus(taskId, status, txHashOrError);
  }

  async getTasksReadyForSubmission(limit: number = 10): Promise<any[]> {
    return this.taskStore.getTasksReadyForSubmission(limit, this.agentAddress);
  }

  async getFailedTasksForRetry(maxRetries: number = 3): Promise<any[]> {
    return this.taskStore.getFailedTasksForRetry(maxRetries, this.agentAddress);
  }

  async incrementTaskRetry(
    taskId: string,
    status: TaskProcessingStatus,
    errorMessage?: string
  ): Promise<void> {
    return this.taskStore.incrementTaskRetry(taskId, status, errorMessage);
  }

  async getStuckTasks(timeoutMs: number = 10 * 60 * 1000): Promise<any[]> {
    return this.taskStore.getStuckTasks(timeoutMs, this.agentAddress);
  }
}
