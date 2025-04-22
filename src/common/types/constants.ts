export const INTERVALS = {
  SECONDS_10: 10 * 1000, // 10 seconds
  MINUTES_1: 1 * 60 * 1000, // 1 minute
  MINUTES_15: 15 * 60 * 1000, // 15 minutes
  MINUTES_30: 30 * 60 * 1000, // 30 minutes
  MINUTES_45: 45 * 60 * 1000, // 45 minutes
  HOUR_1: 60 * 60 * 1000, // 1 hour
};

export const SUPPORTED_TOPICS = [
  "social_twitter:post",
  "social_twitter:post_thread",
  "social_twitter:post_with_image",
  "social_twitter:post_with_video",
  "image_generation:generate_image",
  "video_generation:generate_video",
] as const;

export const TOPIC_TO_ACTION = {
  [SUPPORTED_TOPICS[0]]: "ACT_SOCIAL_POST_TWEET",
  [SUPPORTED_TOPICS[1]]: "ACT_SOCIAL_POST_TWEET",
  [SUPPORTED_TOPICS[2]]: "ACT_SOCIAL_POST_TWEET",
  [SUPPORTED_TOPICS[3]]: "ACT_SOCIAL_POST_TWEET",
  [SUPPORTED_TOPICS[4]]: "ACT_DALLE_GENERATE_IMAGE",
  [SUPPORTED_TOPICS[5]]: "ACT_GENERATE_VIDEO",
} as Record<SupportedTopic, string>;

export const ACTION_TO_TOPIC = {
  ACT_SOCIAL_POST_TWEET: [
    SUPPORTED_TOPICS[0],
    SUPPORTED_TOPICS[1],
    SUPPORTED_TOPICS[2],
    SUPPORTED_TOPICS[3],
  ],
  ACT_DALLE_GENERATE_IMAGE: ["image_generation:generate_image"],
  ACT_GENERATE_VIDEO: ["video_generation:generate_video"],
};

export type SupportedTopic = (typeof SUPPORTED_TOPICS)[number];
