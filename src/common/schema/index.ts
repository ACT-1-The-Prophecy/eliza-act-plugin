export enum EventProcessingStatus {
    UNPROCESSED = "unprocessed",
    PROCESSING = "processing",
    QUEUED = "queued",
    PROCESSED = "processed",
    WAITING = "waiting",
    FAILED = "failed",
    UNMATCHED = "unmatched",
}

export enum TaskProcessingStatus {
    PENDING = "pending", // Task received but not yet processed
    PROCESSING = "processing", // Task is being processed
    READY_FOR_SUBMISSION = "ready_for_submission", // Result ready to submit to blockchain
    SUBMITTING = "submitting", // Currently submitting to blockchain
    SUBMITTED = "submitted", // Successfully submitted to blockchain
    FAILED = "failed", // Processing or submission failed
}

export interface ChainEvent {
    eventId: string;
    eventName: string;
    blockNumber: number;
    transactionIndex: number;
    logIndex: number;
    transactionHash: string;
    eventData: any;
    taskId?: string;
    agentAddress?: string;
    status: EventProcessingStatus;
    processingAttempts: number;
    lastProcessingAttempt?: number;
    errorMessage?: string;
    processedAt?: number;
}

export enum TaskStatus {
    PENDING = "pending",
    ASSIGNED = "assigned",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    SUBMITTED = "submitted",
}

export interface TaskResult {
    taskId: string;
    eventId?: string;
    result: string;
    status: TaskStatus;
    createdAt: number;
    updatedAt: number;
    errorMessage?: string;
    txHash?: string;
}
