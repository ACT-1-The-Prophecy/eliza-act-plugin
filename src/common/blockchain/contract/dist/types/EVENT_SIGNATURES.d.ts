export declare const EVENT_SIGNATURES: {
    readonly SET_CONFIG: "SetConfig(uint8,uint32,uint32,uint32,uint128)";
    readonly SET_VALID_TOPIC: "SetValidTopic(bytes32,bool)";
    readonly REGISTER_AGENT: "RegisterAgent(address)";
    readonly SET_AGENT_TOPIC: "SetAgentTopic(address,bytes32,bool)";
    readonly SET_AGENT_METADATA: "SetAgentMetadata(address)";
    readonly SET_AGENT_PAUSED: "SetAgentPaused(address,bool)";
    readonly STAKE_VALIDATOR: "StakeValidator(address,uint32)";
    readonly CREATE_TASK: "CreateTask(address,uint256)";
    readonly AGENT_INVITE: "AgentInvite(address,uint256)";
    readonly ASSIGN_TASK_BY_CLIENT: "AssignTaskByClient(uint256,address)";
    readonly ASSIGN_TASK_BY_AGENT: "AssignTaskByAgent(uint256,address)";
    readonly SUBMIT_TASK: "SubmitTask(uint256,string)";
    readonly VALIDATE_TASK: "ValidateTask(uint256)";
    readonly DECLINE_TASK: "DeclineTask(uint256)";
    readonly COMPLETE_TASK: "CompleteTask(uint256)";
    readonly DISPUTE_TASK: "DisputeTask(uint256,string)";
    readonly RESOLVE_TASK: "ResolveTask(uint256,uint128,uint128,uint128)";
    readonly DELETE_TASK: "DeleteTask(uint256)";
    readonly WITHDRAW: "Withdraw(address,uint256,uint256)";
};
//# sourceMappingURL=EVENT_SIGNATURES.d.ts.map