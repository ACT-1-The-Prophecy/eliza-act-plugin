import { IAgentRuntime } from "@elizaos/core";
import { SupportedTopic } from "./constants";
import { TopicHandlerResult } from "./topic-handler-result";

export interface ITopicHandler {
  topic: SupportedTopic;
  processTask(task: any, runtime: IAgentRuntime): Promise<TopicHandlerResult>;
}
