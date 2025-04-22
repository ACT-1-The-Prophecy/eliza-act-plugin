import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  elizaLogger,
  generateText,
  ModelClass,
} from "@elizaos/core";

/**
 * Action that allows the agent to create social media posts
 */
export const socialPostAction: Action = {
  name: "ACT_SOCIAL_POST_TWEET",
  description: "Post a message to a social network",
  similes: [
    "tweet",
    "post",
    "share",
    "tweet_with_video",
    "tweet_with_image",
    "tweet_with_thread",
  ],
  examples: [
    [
      {
        user: "User",
        content: {
          text: "Can you post this to Twitter?",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "I'll share this on Twitter for you!",
          action: "SOCIAL_POST_TWEET",
        },
      },
    ],
    [
      {
        user: "User",
        content: {
          text: "Share my latest blog post on social media",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "I've shared your blog post on social media!",
          action: "SOCIAL_POST_TWEET",
        },
      },
    ],
  ],
  // Handler for the action
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<any> => {
    try {
      elizaLogger.info("Executing SOCIAL_POST_TWEET action");
      const content = message.content.text || "";
      elizaLogger.info("Message:", message);
      elizaLogger.info("Content:", content);
      const platform = message.content.platform || "twitter";

      const tweetOutput = await generateText({
        runtime,
        context:
          content +
          "\n\n" +
          `You are a professional social media manager focussed on X/Twitter.
                    Generate a tweet that:
                    1. Is engaging and informative
                    2. Is under 150 characters
                    3. Includes relevant hashtags

                    Format the response as a single tweet with no additional text or explanations.`,
        modelClass: ModelClass.SMALL,
      });
      let tweetContent = tweetOutput;

      elizaLogger.info("Tweet content:", tweetContent);
      if (tweetContent[0] === '"') {
        tweetContent = tweetContent.slice(1);
      }
      if (tweetContent[tweetContent.length - 1] === '"') {
        tweetContent = tweetContent.slice(0, -1);
      }

      let mediaData: any[] | undefined;
      let threadParts: string[] | null = null;

      const skillType = (message.content.topic as string).split(":")[1];

      if (skillType.includes("video")) {
        //Add here video generation logic
      }

      elizaLogger.info("Generated tweet:", {
        tweetContent,
        hasMedia: !!mediaData,
        mediaDataSize: mediaData?.[0]?.data?.length,
        hasThread: !!threadParts,
        threadLength: threadParts?.length,
      });

      if (
        mediaData &&
        (!mediaData[0]?.data || mediaData[0].data.length === 0)
      ) {
        elizaLogger.warn("Invalid media data, returning tweet without image");
        mediaData = undefined;
      }

      const twitterClient = runtime.clients.find(
        (client) => client.constructor.name === "TwitterManager"
      ) as any;
      if (!twitterClient) {
        throw new Error("Twitter client not found");
      }

      await runtime.ensureUserExists(
        runtime.agentId,
        twitterClient.client.profile.username,
        runtime.character.name,
        "twitter"
      );

      const tweetResult = await twitterClient.post.sendStandardTweet(
        twitterClient.client,
        tweetContent,
        null,
        mediaData
      );

      const tweetInfo = {
        id: tweetResult.rest_id,
        text: tweetContent,
        url: `https://twitter.com/${twitterClient.client.profile.username}/status/${tweetResult.rest_id}`,
        username: twitterClient.client.profile.username,
        screenName: twitterClient.client.profile.screenName,
        timestamp: new Date().toISOString(),
        isThread: !!threadParts,
        hasImage: !!mediaData,
      };
      elizaLogger.info("Tweet info:", tweetInfo);

      elizaLogger.success(`Successfully posted to ${platform}`);
      return tweetInfo;
    } catch (error) {
      elizaLogger.error("Error in SOCIAL_POST_TWEET action:", error);
      throw error;
    }
  },
  validate: async (): Promise<boolean> => {
    return true;
  },
  suppressInitialMessage: false,
};

export default socialPostAction;
