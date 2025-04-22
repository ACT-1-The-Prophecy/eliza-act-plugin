import {
  Plugin,
  Service,
  IAgentRuntime,
  elizaLogger,
  ServiceType,
} from "@elizaos/core";
import * as https from "https"; // Import for Node.js HTTPS agent
import { MarketApiClient } from "../api";
import { AgentFilterDto, TaskFilterDto } from "../api/base/filter.dto";
import { TokenManager } from "../api/base/token.manager";

export { MarketApiClient };

export { AgentFilterDto, TaskFilterDto };

export class ApiService extends Service {
  private marketApiClient: MarketApiClient | null = null;
  private tokenManager: TokenManager | null = null;
  private apiUrl: string | null = null;
  private login: string | null = null;
  private password: string | null = null;

  constructor() {
    super();
  }

  async initialize(runtime: IAgentRuntime): Promise<void> {
    try {
      this.apiUrl = runtime.getSetting("API_URL");
      this.login = runtime.getSetting("AGENT_EMAIL");
      this.password = runtime.getSetting("AGENT_PASSWORD");

      if (!this.apiUrl || !this.login || !this.password) {
        elizaLogger.error(
          "API_URL or AGENT_EMAIL or AGENT_PASSWORD not configured. API client will not be initialized."
        );
        throw new Error(
          "API_URL or AGENT_EMAIL or AGENT_PASSWORD not configured. API client will not be initialized."
        );
      }

      elizaLogger.info(`API Service initializing with URL: ${this.apiUrl}`);

      elizaLogger.info(`Node.js version: ${process.version}`);

      this.tokenManager = new TokenManager(async () => {
        try {
          elizaLogger.info(
            `Logging in to ACT API. URL: ${this.apiUrl}, User: ${this.login}`
          );

          // Create HTTPS agent with more permissive SSL verification for debugging
          const agent = new https.Agent({
            rejectUnauthorized: false, // Warning: security risk, only use for debugging
          });

          // Log all details about the request for debugging
          const requestBody = JSON.stringify({
            email: this.login,
            password: this.password,
          });

          elizaLogger.info(`Request body: ${requestBody}`);

          const response = await fetch(`${this.apiUrl}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "User-Agent": "Mozilla/5.0 (Node.js)",
            },
            body: requestBody,
            // @ts-ignore - Depending on fetch implementation, this might need adjustment
            agent: agent,
          });

          // Convert headers to a plain object for logging
          const headersObj = {};
          response.headers.forEach((value, name) => {
            headersObj[name] = value;
          });

          elizaLogger.info(
            `Response status: ${
              response.status
            }. Response headers: ${JSON.stringify(headersObj)}`
          );

          if (!response.ok) {
            const errorText = await response.text();
            elizaLogger.error(
              `Cannot login to ACT API.
                            URL: ${this.apiUrl}
                            Status: ${response.status}
                            Error: ${errorText}`
            );
            throw new Error(
              `Cannot login to ACT API: ${response.status} - ${errorText}`
            );
          }

          const data = await response.json();
          elizaLogger.info("ACT API login successful, received token");
          return data.data.access_token;
        } catch (error) {
          elizaLogger.error(
            `Exception during login to ACT API.
                        URL: ${this.apiUrl}
                        Error: ${error.message}
                        Stack: ${error.stack}`
          );
          throw error;
        }
      }, 60);

      this.marketApiClient = new MarketApiClient(
        this.apiUrl,
        this.tokenManager
      );

      elizaLogger.info("ACT API Service initialized successfully");
    } catch (error) {
      elizaLogger.error(
        `Exception during API service initialization.
                URL: ${this.apiUrl || "undefined"}
                Error: ${error.message}
                Stack: ${error.stack}`
      );
      throw error;
    }
  }

  getMarketApiClient(): MarketApiClient | null {
    return this.marketApiClient;
  }

  static get serviceType(): ServiceType {
    return ServiceType.WEB_SEARCH;
  }
}

export const actApiPlugin: Plugin = {
  name: "ACT API Plugin",
  description: "Plugin for interacting with ACT APIs",
  actions: [],
  providers: [],
  evaluators: [],
  services: [new ApiService()],
  clients: [],
};

export default actApiPlugin;
export * from "./marketplace.service";
