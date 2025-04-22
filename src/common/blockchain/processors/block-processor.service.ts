import { elizaLogger } from "@elizaos/core";
import { ethers } from "ethers";
import { WalletService } from "../services/wallet.service";
import { EventProcessingStatus } from "../../schema";
import { StateStoreService } from "../../storage/services";
import { EVENT_SIGNATURES } from "../contract/dist";

/**
    Fetches and saves raw events.
 */
export class BlockProcessorService {
  constructor(
    private readonly marketService: WalletService,
    private readonly stateStore: StateStoreService,
    private readonly publicKey: string
  ) {
    elizaLogger.debug(
      `MARKETPLACE PLUGIN: ${BlockProcessorService.name} created`
    );
  }

  async processBlockRange(fromBlock: number, toBlock: number): Promise<void> {
    try {
      const contractAddress = this.marketService.getContractAddress();
      const filter = this.createEventFilter(contractAddress);

      elizaLogger.debug(
        `Fetching logs for block range: ${fromBlock} - ${toBlock}`
      );

      const logs = await this.marketService.getLogs({
        ...filter,
        fromBlock,
        toBlock,
      });

      if (logs.length > 0) {
        elizaLogger.info(
          `Found ${logs.length} historical events for agent ${this.publicKey} in blocks ${fromBlock}-${toBlock}`
        );
      }

      if (logs.length === 0) {
        return;
      }

      // First save all events to the database
      for (const log of logs) {
        await this.saveEventFromLog(log);
      }
    } catch (error) {
      if (error.code === "ECONNRESET") {
        // Implement exponential backoff or wait and retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.processBlockRange(fromBlock, toBlock);
      }
      elizaLogger.error(
        `Error processing block range ${fromBlock}-${toBlock}: ${error.message}`,
        error
      );
      throw error;
    }
  }

  public async saveEventFromLog(log: ethers.Log): Promise<void> {
    try {
      const contract = this.marketService.getContract();
      const parsedLog = contract.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });

      if (!parsedLog) {
        return;
      }

      const eventId = `${log.transactionHash}-${log.index}`;
      const eventName = parsedLog.name;

      let taskId: string | undefined;
      let agentAddress: string | undefined;

      if (
        eventName === "AssignTaskByAgent" ||
        eventName === "AssignTaskByClient"
      ) {
        taskId = parsedLog.args.taskId.toString();
        agentAddress = parsedLog.args.assignedAgent;
      }

      await this.stateStore.saveEvent({
        eventId,
        eventName,
        blockNumber: log.blockNumber,
        transactionIndex: log.transactionIndex,
        logIndex: log.index,
        transactionHash: log.transactionHash,
        taskId,
        agentAddress: this.publicKey,
        status: EventProcessingStatus.UNPROCESSED,
      });
    } catch (error) {
      elizaLogger.error(`Error saving event from log: ${error.message}`, error);
    }
  }

  public createEventFilter(contractAddress: string) {
    return {
      address: contractAddress,
      topics: [
        [
          ethers.id(EVENT_SIGNATURES.ASSIGN_TASK_BY_CLIENT),
          ethers.id(EVENT_SIGNATURES.ASSIGN_TASK_BY_AGENT),
        ],
        null,
        ethers.zeroPadValue(this.publicKey, 32),
      ],
    };
  }
}
