import {
  Service,
  IAgentRuntime,
  elizaLogger,
  ServiceType,
  Memory,
  Action,
} from "@elizaos/core";
import {
  EventProcessorJob,
  TopicTaskRetryJob,
  TaskSubmissionJob,
  AgentHeartbeatJob,
} from "../tasks/jobs";

import { EventManagerService } from "../tasks/services/event-manager.service";
import { TaskProcessingService } from "../tasks/services/task-processing.service";
import {
  ACTION_TO_TOPIC,
  INTERVALS,
  SupportedTopic,
  TOPIC_TO_ACTION,
} from "../types";
import {
  EventProcessorService,
  BlockProcessorService,
} from "../blockchain/processors";
import {
  WalletService,
  EventListenerService,
  BlockTrackerService,
} from "../blockchain/services";
import { StateStoreService } from "../storage/services";
import { ApiService } from ".";
import { ITopicHandler } from "../types/ITopicHandler";

export class MarketplaceService extends Service {
  private services: {
    eth?: WalletService;
    stateStore?: StateStoreService;
    eventListener?: EventListenerService;
    eventProcessor?: EventProcessorService;
    taskProcessor?: TaskProcessingService;
    eventManager?: EventManagerService;
    blockTracker?: BlockTrackerService;
    blockProcessor?: BlockProcessorService;
    taskSubmissionJob?: TaskSubmissionJob;
    taskRetryJob?: TopicTaskRetryJob;
    eventProcessorJob?: EventProcessorJob;
    agentHeartbeatJob?: AgentHeartbeatJob;
    actApi?: ApiService;
  } = {};

  private handlers: ITopicHandler[] = [];

  constructor() {
    super();
  }

  async initialize(runtime: IAgentRuntime): Promise<void> {
    try {
      this.handlers = this.discoverHandlersFromActions(runtime);

      const settings = this.validateAndGetSettings(runtime);
      await this.initializeCoreServices(runtime, settings);
      await this.setupEventProcessing(runtime, settings.publicKey);
      await this.initializeBackgroundJobs(runtime);
      elizaLogger.success("ACT Marketplace Service initialized successfully");
    } catch (error) {
      this.handleInitializationError(error);
    }
  }

  private async initializeCoreServices(
    runtime: IAgentRuntime,
    settings: any
  ): Promise<void> {
    this.services.eth = new WalletService(
      settings.rpcUrl,
      settings.contractAddress
    );

    const apiService = runtime.services.get(ServiceType.WEB_SEARCH);
    this.services.actApi = apiService as ApiService;

    this.services.stateStore = new StateStoreService(runtime);
    await this.services.stateStore.initialize();

    this.services.blockTracker = new BlockTrackerService(
      {
        lastProcessedBlock: settings.lastProcessedBlock,
        contractDeploymentBlock: settings.contractDeploymentBlock,
      },
      this.services.stateStore,
      settings.publicKey
    );
    await this.services.blockTracker.initialize();

    this.services.blockProcessor = new BlockProcessorService(
      this.services.eth,
      this.services.stateStore,
      settings.publicKey
    );

    this.services.eventListener = new EventListenerService(
      this.services.blockTracker,
      this.services.blockProcessor,
      this.services.eth
    );

    this.services.taskSubmissionJob = new TaskSubmissionJob(
      this.services.stateStore,
      this.services.eth,
      settings.publicKey,
      settings.privateKey
    );
  }

  private async setupEventProcessing(
    runtime: IAgentRuntime,
    publicKey: string
  ): Promise<void> {
    // Map topics to handlers

    const topicToHandlerMap = new Map(
      this.handlers.map((handler) => [handler.topic, handler])
    );

    // Event processor
    this.services.eventProcessor = new EventProcessorService(
      this.services.stateStore
    );

    // Task processor
    this.services.taskProcessor = new TaskProcessingService(
      this.services.stateStore,
      this.services.taskSubmissionJob
    );

    // Event manager connects events to tasks
    this.services.eventManager = new EventManagerService(
      this.services.eventProcessor,
      this.services.taskProcessor,
      this.services.eth
    );

    // Register handlers with the event system
    this.services.eventManager.registerEventHandlers(
      publicKey,
      topicToHandlerMap,
      runtime
    );

    // Start listening for blockchain events
    await this.services.eventListener.init();
  }

  private async initializeBackgroundJobs(
    runtime: IAgentRuntime
  ): Promise<void> {
    // Create topic processors map for retry job
    const topicProcessors = new Map(
      this.handlers.map((handler) => [
        handler.topic,
        async (task: any) =>
          this.services.taskProcessor.processTask(task, handler, runtime),
      ])
    );

    // Initialize jobs
    this.services.taskRetryJob = new TopicTaskRetryJob(
      this.services.stateStore,
      topicProcessors
    );

    this.services.eventProcessorJob = new EventProcessorJob(
      this.services.eventProcessor,
      this.services.stateStore,
      INTERVALS.SECONDS_10,
      INTERVALS.MINUTES_15,
      INTERVALS.MINUTES_30
    );

    const instanceId = `agent-${runtime.agentId}`;
    this.services.agentHeartbeatJob = new AgentHeartbeatJob(
      this.services.actApi,
      this.services.blockTracker,
      this.validateAndGetSettings(runtime).publicKey,
      instanceId,
      INTERVALS.MINUTES_1
    );

    // Start all background jobs
    this.services.taskSubmissionJob.start();
    this.services.taskRetryJob.start();
    this.services.eventProcessorJob.start();
    this.services.agentHeartbeatJob.start();
  }

  private handleInitializationError(error: Error): void {
    elizaLogger.error("Failed to initialize ACT Marketplace Service:", error);
    this.cleanup();
    throw error;
  }

  private matchAgentActionsToTopics(
    agentRegisteredActions: Action[],
    actionToTopicsMap
  ) {
    const matchedTopics = [];

    agentRegisteredActions.forEach((action) => {
      if (actionToTopicsMap[action.name]) {
        matchedTopics.push(...actionToTopicsMap[action.name]);
      }
    });
    return matchedTopics;
  }

  private discoverHandlersFromActions(runtime: IAgentRuntime): ITopicHandler[] {
    const actionHandlers: ITopicHandler[] = [];

    const topics = this.matchAgentActionsToTopics(
      runtime.actions,
      ACTION_TO_TOPIC
    );

    topics.forEach((topic) => {
      const agentAction = runtime.actions.find(
        (e) => e.name === TOPIC_TO_ACTION[topic]
      );

      if (topic) {
        actionHandlers.push({
          topic: topic as SupportedTopic,
          processTask: async (task, runtime) => {
            try {
              let taskPrompt = task.payload;
              if (runtime.getSetting("API_URL") !== "MOCK") {
                const marketApiClient =
                  this.services.actApi?.getMarketApiClient();
                const taskApiData = await marketApiClient?.getTaskById(
                  task.taskId.toString()
                );

                taskPrompt =
                  taskApiData?.data?.metadata?.prompt ||
                  "MOCK TEXT IF SOME PROBLEM OCCURS";
              }

              elizaLogger.info(
                `Starting task processing.
                                TaskID:${task.taskId}.
                                Task prompt: ${taskPrompt}.`
              );

              const memory: Memory = {
                id: task.taskId.toString(),
                content: {
                  text: taskPrompt,
                  action: agentAction.name,
                  topic: task.topic,
                },
                createdAt: Date.now(),
                userId: runtime.agentId,
                agentId: runtime.agentId,
                roomId: runtime.agentId,
              };
              const state = await runtime.composeState(memory);
              elizaLogger.info(
                `Calling action: ${agentAction.name}.
                                 TaskID:${task.taskId}.
                                 Content: ${task.payload}`
              );
              const response = await agentAction.handler(
                runtime,
                memory,
                state
              );

              debugger;

              return {
                success: true,
                result: response,
                error: null,
              };
            } catch (error) {
              elizaLogger.error(
                `Error processing action: ${agentAction.name}.
                                 TaskID:${task.taskId}.
                                 Content: ${task.payload}`,
                error.message
              );
              return {
                success: false,
                result: null,
                error: error.message,
              };
            }
          },
        });

        elizaLogger.info(
          `Discovered handler for topic ${topic} with action ${agentAction.name}`
        );
      }
    });

    return actionHandlers;
  }
  async cleanup(): Promise<void> {
    const stoppableMethods = ["stop", "cleanup", "close"];

    for (const [name, service] of Object.entries(this.services)) {
      if (service) {
        for (const methodName of stoppableMethods) {
          if (typeof (service as any)[methodName] === "function") {
            try {
              (service as any)[methodName]();
              elizaLogger.info(`Stopped service: ${name}`);
              break;
            } catch (error) {
              elizaLogger.error(`Error stopping ${name}:`, error);
            }
          }
        }
      }
    }
  }

  static get serviceType(): ServiceType {
    return ServiceType.TEXT_GENERATION;
  }

  private validateAndGetSettings(runtime: IAgentRuntime): any {
    const requiredSettings = [
      "PRIVATE_KEY",
      "PUBLIC_KEY",
      "CONTRACT_ADDRESS",
      "RPC_URL",
      "CONTRACT_DEPLOYMENT_BLOCK",
    ];

    requiredSettings.forEach((setting) => {
      if (!runtime.getSetting(setting)) {
        throw new Error(`Missing required setting: ${setting}`);
      }
    });

    return {
      privateKey: runtime.getSetting("PRIVATE_KEY"),
      publicKey: runtime.getSetting("PUBLIC_KEY"),
      contractAddress: runtime.getSetting("CONTRACT_ADDRESS"),
      rpcUrl: runtime.getSetting("RPC_URL") || "http://localhost:8545",
      contractDeploymentBlock: parseInt(
        runtime.getSetting("CONTRACT_DEPLOYMENT_BLOCK") || "0"
      ),
      lastProcessedBlock: parseInt(
        runtime.getSetting("LAST_PROCESSED_BLOCK") || "0"
      ),
    };
  }
}
