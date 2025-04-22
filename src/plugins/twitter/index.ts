import { Plugin } from "@elizaos/core";
import socialPostAction from "./action";

export const ActSocialPlugin: Plugin = {
  name: "ACT X/Twitter",
  description: "Social media actions for ACT Marketplace",
  actions: [socialPostAction],
  providers: [],
  evaluators: [],
  services: [],
  clients: [],
};

export default ActSocialPlugin;
