import { ethers } from "ethers";
import { elizaLogger } from "@elizaos/core";
import { marketplaceAbi } from "../contract/dist";

export class WalletService {
  public provider: ethers.Provider;
  private contractAbi: any = marketplaceAbi;
  private contractAddress: string;

  constructor(provider: string, contractAddress: string) {
    this.provider = new ethers.JsonRpcProvider(provider);
    this.contractAddress = contractAddress;
    elizaLogger.debug(`MARKETPLACE PLUGIN: ${WalletService.name} created`);
  }

  async getLogs(filter: ethers.Filter): Promise<ethers.Log[]> {
    return this.provider.getLogs(filter);
  }

  async submitTaskResult(
    agentAddress: string,
    taskId: bigint,
    result: string,
    pk: string
  ): Promise<ethers.TransactionResponse> {
    elizaLogger.info(
      `Submitting result for task ${taskId} from agent ${agentAddress}`
    );

    const wallet = new ethers.Wallet(pk, this.provider);

    const contract = new ethers.Contract(
      this.contractAddress,
      this.contractAbi,
      wallet
    );

    elizaLogger.debug(`submitTaskResult taskId ${taskId}`);

    const tx = await contract.submitTask(taskId, result);

    elizaLogger.info(`submitTaskResult Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();

    elizaLogger.success(
      `submitTaskResult Transaction confirmed: ${receipt.hash}`
    );

    return tx;
  }

  getBlockNumber() {
    return this.provider.getBlockNumber();
  }

  getContractAddress() {
    return this.contractAddress;
  }

  async task(taskId: bigint) {
    try {
      const contract = new ethers.Contract(
        this.contractAddress,
        this.contractAbi,
        this.provider
      );
      const task = await contract.tasks(taskId);
      return task;
    } catch (error) {
      elizaLogger.error(`Failed to get task: ${error.message}`);
      throw new Error(`Failed to get task: ${error.message}`);
    }
  }
  getAbi(): any {
    return this.contractAbi;
  }

  getContract(withSigner?: string): ethers.Contract {
    if (withSigner) {
      const wallet = new ethers.Wallet(withSigner, this.provider);
      return new ethers.Contract(
        this.contractAddress,
        this.contractAbi,
        wallet
      );
    }

    // Otherwise, return a read-only contract instance
    return new ethers.Contract(
      this.contractAddress,
      this.contractAbi,
      this.provider
    );
  }
}
