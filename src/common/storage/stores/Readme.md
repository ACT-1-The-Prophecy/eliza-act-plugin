State Management Tables

act_marketplace_blocks: Tracks last processed block per agent
act_marketplace_events: Stores blockchain events with processing status
act_marketplace_task_results: Manages task processing lifecycle

Event Processing States (EventProcessingStatus):

UNPROCESSED: Initial state
PROCESSING: Currently being handled
QUEUED: Waiting in queue
PROCESSED: Successfully completed
WAITING: Pending additional action
FAILED: Processing unsuccessful
UNMATCHED: No handler found

Task Processing States (TaskProcessingStatus):

PENDING: Task received
PROCESSING: Currently executing
READY_FOR_SUBMISSION: Result prepared
SUBMITTING: Blockchain submission in progress
SUBMITTED: Successfully sent to blockchain
FAILED: Processing or submission failed
