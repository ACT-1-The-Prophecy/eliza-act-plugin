export interface IRpcEventHandler {
    handleEvent(parsedLog: any, blockNumber: number): Promise<any>;
}
