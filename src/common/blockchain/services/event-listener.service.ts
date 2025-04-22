import { elizaLogger } from "@elizaos/core";
import { WalletService } from "./wallet.service";
import { BlockProcessorService } from "../processors/block-processor.service";
import { BlockTrackerService } from "./block-tracker.service";

export class EventListenerService {
    private readonly BLOCK_BATCH_SIZE = 1000;
    private readonly POLLING_INTERVAL = 15000; // Poll every 15 seconds
    private isInitialized = false;
    private pollingTimer: NodeJS.Timeout | null = null;
    private isPolling = false;

    constructor(
        private readonly blockTracker: BlockTrackerService,
        private readonly blockProcessor: BlockProcessorService,
        private readonly walletService: WalletService
    ) {
        elizaLogger.debug(
            `MARKETPLACE PLUGIN: ${EventListenerService.name} created`
        );
    }

    public async init(): Promise<void> {
        if (this.isInitialized) return;

        elizaLogger.info("Initializing blockchain event listener...");
        await this.processHistoricalEvents();
        await this.setupPolling();
        this.isInitialized = true;
        elizaLogger.info("Blockchain event listener initialized successfully");
    }

    private async processHistoricalEvents(): Promise<void> {
        elizaLogger.info("Processing historical events...");
        this.blockTracker.setProcessingHistorical(true);

        try {
            const lastProcessedBlock =
                this.blockTracker.getLastProcessedBlock();
            const currentBlock = await this.walletService.getBlockNumber();

            if (lastProcessedBlock >= currentBlock) {
                elizaLogger.info("No new blocks to process");
                return;
            }

            let fromBlock = Math.max(lastProcessedBlock + 1, 0);
            while (fromBlock < currentBlock) {
                const toBlock = Math.min(
                    fromBlock + this.BLOCK_BATCH_SIZE,
                    currentBlock
                );
                await this.blockProcessor.processBlockRange(fromBlock, toBlock);
                fromBlock = toBlock + 1;
                await this.blockTracker.saveLastProcessedBlock(toBlock);
            }

            elizaLogger.info("Historical event processing completed");
        } catch (error) {
            elizaLogger.error("Error processing historical events:", error);
        } finally {
            this.blockTracker.setProcessingHistorical(false);
        }
    }

    private async setupPolling(): Promise<void> {
        elizaLogger.info("Setting up blockchain polling...");

        // Start the polling immediately
        await this.pollForNewBlocks();

        // Then set up interval
        this.pollingTimer = setInterval(
            () => this.pollForNewBlocks(),
            this.POLLING_INTERVAL
        );

        elizaLogger.info(
            `Polling set up with interval of ${this.POLLING_INTERVAL}ms`
        );
    }

    private async pollForNewBlocks(): Promise<void> {
        // Prevent concurrent polling
        if (this.isPolling) {
            elizaLogger.debug(
                "Already polling for new blocks, skipping this cycle"
            );
            return;
        }

        this.isPolling = true;
        try {
            const lastProcessedBlock =
                this.blockTracker.getLastProcessedBlock();
            const currentBlock = await this.walletService.getBlockNumber();

            if (currentBlock <= lastProcessedBlock) {
                elizaLogger.debug("No new blocks to process");
                return;
            }

            elizaLogger.info(
                `Polling: Processing blocks from ${
                    lastProcessedBlock + 1
                } to ${currentBlock}`
            );

            // Process blocks in small batches to avoid timeouts
            const batchSize = 100; // Smaller batch size for polling to reduce load
            let fromBlock = lastProcessedBlock + 1;

            while (fromBlock <= currentBlock) {
                const toBlock = Math.min(
                    fromBlock + batchSize - 1,
                    currentBlock
                );

                elizaLogger.debug(
                    `Processing block range: ${fromBlock} - ${toBlock}`
                );

                await this.blockProcessor.processBlockRange(fromBlock, toBlock);
                await this.blockTracker.saveLastProcessedBlock(toBlock);

                fromBlock = toBlock + 1;
            }

            elizaLogger.info(`Polling: Processed blocks up to ${currentBlock}`);
        } catch (error) {
            elizaLogger.error(
                `Error during block polling: ${error.message}`,
                error
            );
        } finally {
            this.isPolling = false;
        }
    }

    public stop(): void {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }

        this.walletService.provider.removeAllListeners();
        elizaLogger.info("Stopped blockchain polling and all event listeners");
    }
}
