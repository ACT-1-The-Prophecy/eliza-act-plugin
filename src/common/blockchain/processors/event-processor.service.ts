import { elizaLogger } from "@elizaos/core";
import { EventProcessingStatus } from "../../schema";
import { StateStoreService } from "../../storage/services";

//This class processes events from the state store
export class EventProcessorService {
    private handlers: Map<string, (event: any) => Promise<boolean>> = new Map();
    private processing = false;

    constructor(private readonly stateStore: StateStoreService) {
        elizaLogger.debug(
            `MARKETPLACE PLUGIN: ${EventProcessorService.name} created`
        );
    }

    registerHandler(
        eventName: string,
        handler: (event: any) => Promise<boolean>
    ): void {
        this.handlers.set(eventName, handler);
        elizaLogger.info(`Registered handler for event type: ${eventName}`);
    }

    async processEvents(): Promise<void> {
        if (this.processing) {
            return;
        }

        this.processing = true;
        try {
            const events = await this.stateStore.getUnprocessedEvents(10);

            if (events.length === 0) {
                return;
            }
            elizaLogger.info(`Processing ${events.length} unprocessed events`);

            for (const event of events) {
                elizaLogger.info(
                    `Processing event: ${JSON.stringify({
                        event_id: event.event_id,
                        event_name: event.event_name,
                        transaction_hash: event.transaction_hash,
                    })}`
                );
                await this.processEvent(event);
            }
        } catch (error) {
            elizaLogger.error(
                `Error processing events: ${error.message}`,
                error
            );
        } finally {
            this.processing = false;
        }
    }

    private async processEvent(event: any): Promise<void> {
        await this.stateStore.updateEventStatus(
            event.event_id,
            EventProcessingStatus.PROCESSING
        );

        try {
            const handler = this.handlers.get(event.event_name);

            if (!handler) {
                elizaLogger.debug(
                    `No handler registered for event type: ${event.event_name}`
                );
                await this.stateStore.updateEventStatus(
                    event.event_id,
                    EventProcessingStatus.UNMATCHED
                );
                return;
            }

            const success = await handler(event);
            if (success) {
                await this.stateStore.updateEventStatus(
                    event.event_id,
                    EventProcessingStatus.PROCESSED
                );

                elizaLogger.info(
                    `Successfully processed event ${event.event_id}`
                );
            } else {
                await this.stateStore.updateEventStatus(
                    event.event_id,
                    EventProcessingStatus.FAILED,
                    "Handler returned unsuccessful result"
                );
                elizaLogger.warn(`Event ${event.event_name} processing failed`);
            }
        } catch (error) {
            elizaLogger.error(
                `Error processing event ${event.event_name}: ${error.message} ID:${event.event_id}`,
                error
            );
            await this.stateStore.updateEventStatus(
                event.event_id,
                EventProcessingStatus.FAILED,
                error.message
            );
        }
    }
}
