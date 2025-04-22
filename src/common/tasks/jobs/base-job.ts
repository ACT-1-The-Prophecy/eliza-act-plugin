import { elizaLogger } from "@elizaos/core";

export abstract class BaseJob {
    protected isRunning = false;
    protected checkInterval: NodeJS.Timeout;
    protected processing = false;

    constructor(
        protected readonly serviceName: string,
        protected readonly checkIntervalMs: number = 60 * 1000
    ) {}

    public start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        this.scheduleNextCheck();

        elizaLogger.info(
            `${this.serviceName} started (checking every ${
                this.checkIntervalMs / 1000
            }s)`
        );
    }

    public stop(): void {
        if (!this.isRunning) return;

        if (this.checkInterval) clearTimeout(this.checkInterval);
        this.isRunning = false;

        elizaLogger.info(`${this.serviceName} stopped`);
    }

    protected scheduleNextCheck(): void {
        this.checkInterval = setTimeout(
            () => this.processJob(),
            this.checkIntervalMs
        );
    }

    private async processJob(): Promise<void> {
        if (!this.isRunning || this.processing) {
            this.scheduleNextCheck();
            return;
        }

        this.processing = true;
        try {
            await this.executeCycle();
        } catch (error) {
            elizaLogger.error(`Error in ${this.serviceName}:`, error);
        } finally {
            this.processing = false;
            if (this.isRunning) {
                this.scheduleNextCheck();
            }
        }
    }

    protected abstract executeCycle(): Promise<void>;
}
