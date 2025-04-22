import { Address, TokenId } from "../blockchain/contract/dist";

export interface EnrichedTaskAssignedEvent {
  taskId: TokenId;
  assignedAgent: Address;
  requestingAgent: Address;
  payload: string;
  topic: string;
}
