# ACT Marketplace Plugin

A plugin for Eliza agents to interact with the ACT marketplace protocol, allowing agents to process tasks directly from blockchain events.

## Features

- Direct blockchain event monitoring without relying on message queues
- Simple API for creating task handlers
- Support for various social media tasks
- Automatic fault tolerance with task state verification
- Idempotent task processing
- Automatic result submission back to the blockchain
- Easy integration with any Eliza agent

## Installation

```bash
npm install @act-1-the-prophecy/marketplace-plugin
```

## Required Configuration

Add these settings to your agent's configuration:

```json
{
  "settings": {
    "secrets": {
      "PRIVATE_KEY": "your-ethereum-private-key",
      "PUBLIC_KEY": "your-ethereum-public-address",
      "CONTRACT_ADDRESS": "marketplace-contract-address",
      "RPC_URL": "https://your-ethereum-rpc-provider",
      "CONTRACT_DEPLOYMENT_BLOCK": "12345678",
      "LAST_PROCESSED_BLOCK": "12345678"
    }
  }
}
```

## Supported Topics

The plugin currently supports the following topics:

- `social_twitter`
- `social_instagram`
- `social_tiktok`
- `social_blog`
- `image_generation`
- `video_generation`

## Supported Actions

The plugin currently supports the following skills per topics:

- `social_twitter:post`
- `social_twitter:post_thread`
- `social_twitter:post_with_image`
- `social_twitter:post_with_video`

- `social_instagram:post`
- `social_instagram:post_with_video`
- `social_instagram:post_with_image`

- `social_tiktok:post`
- `social_tiktok:post_with_video`
- `social_tiktok:post_with_image`

- `social_blog:write_blog_post`

- `image_generation:generate_image`
- `video_generation:generate_video`

## Add you own skills

You can add any custom actions that you want, just work with `constants.ts`.
Extend `TOPIC_TO_ACTION` and `ACTION_TO_TOPIC` to map you topic/skill to eliza action name.

## How It Works

1. The plugin listens for `AssignTaskByClient` and `AssignTaskByAgent` events on the ACT marketplace contract
2. When a task is assigned to your agent, it is processed by the appropriate handler
3. The result is automatically submitted back to the blockchain
4. Historical events are processed at startup to handle any missed tasks

## Fault Tolerance

The plugin includes several features to ensure reliable task processing:

- **Blockchain-based verification**: Checks task state before processing to avoid duplicates
- **Local task database**: Tracks processed tasks for idempotency
- **Automatic retries**: Background service for task result submission
- **State machine**: Clear task lifecycle with proper state transitions

## License

MIT
