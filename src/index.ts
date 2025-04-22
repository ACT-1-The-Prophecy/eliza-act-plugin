import { MarketplaceService } from "./common/core/marketplace.service";
import { Plugin } from "@elizaos/core";
export * from "./common/types";
export * from "./common/core";

export const marketplacePlugin: Plugin = {
  name: "ACT Marketplace",
  description: "Plugin for interacting with the ACT marketplace protocol",
  actions: [],
  providers: [],
  evaluators: [],
  services: [new MarketplaceService()],
  clients: [],
};

export default marketplacePlugin;
