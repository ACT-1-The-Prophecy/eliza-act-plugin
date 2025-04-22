"use strict";
// import {
//   Chain,
//   createPublicClient,
//   createWalletClient,
//   defineChain,
//   http,
//   WalletClient,
// } from 'viem';
// import { privateKeyToAccount } from 'viem/accounts';
// export const BLOCKCHAIN_CLIENTS = {
//   chain: defineChain({
//     id: 1315,
//     name: 'Story Aeneid Testnet',
//     nativeCurrency: { decimals: 18, name: 'IP', symbol: 'IP' },
//     rpcUrls: { default: { http: [process.env.NETWORK_RPC_URL!] } },
//     blockExplorers: {
//       default: {
//         name: 'Aeneid Testnet Explorer',
//         url: process.env.NETWORK_RPC_URL!,
//       },
//     },
//     testnet: true,
//   }) as Chain,
//   getPublic(account: `0x${string}`, chain?: Chain) {
//     return createPublicClient({
//       chain: chain ? chain : this.chain,
//       transport: http(),
//     });
//   },
//   getClients(privateKey: `0x${string}`): {
//     wallet: WalletClient;
//     // story: any;
//   } {
//     if (!privateKey) throw new Error('Private key is required');
//     const account = privateKeyToAccount(privateKey);
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//     return {
//       wallet: createWalletClient({
//         account,
//         chain: this.chain,
//         transport: http(),
//       }) as WalletClient,
//       // public: createPublicClient({
//       //   chain: this.chain,
//       //   transport: http(),
//       // }) as PublicClient,
//       // story: StoryClient.newClient({
//       //   account,
//       //   chainId: '1315',
//       //   transport: http(),
//       // }),
//     };
//   },
// };
// // async function main() {
// //   //TODO:
// //   const response = await client.ipAsset.register({
// //     tokenId: '12',
// //     nftContract: '' as Address,
// //     txOptions: { waitForTransaction: true },
// //     ipMetadata: {
// //       ipMetadataHash: '0x',
// //       ipMetadataURI: '',
// //       nftMetadataHash: '0x',
// //       nftMetadataURI: '',
// //     },
// //   });
// //   console.log(response);
// // }
// // main();
//# sourceMappingURL=clients.js.map