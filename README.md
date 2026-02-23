# Ecomail MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server for [Ecomail](https://ecomail.cz) — the email marketing platform. Manage lists, subscribers, campaigns, automations, transactional emails, e-commerce transactions, templates, domains, and more — directly from any MCP client like [Claude Desktop](https://claude.ai/download), [Cursor](https://cursor.com), or [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

## Features

- **Lists** — View, create, update lists. Get subscribers, subscribe/unsubscribe, bulk subscribe, manage segments.
- **Subscribers** — Get subscriber details globally, delete subscribers, search contacts across all lists.
- **Campaigns** — List, create, update, send campaigns. Get aggregate and per-subscriber stats, segment stats.
- **Automations** — List automations, trigger for subscribers, get aggregate and detailed stats.
- **Transactional Emails** — Send transactional emails with custom content or templates. View stats and double opt-in stats.
- **Transactions** — Create, update, delete e-commerce transactions. Bulk create/delete. Get paginated transactions.
- **Templates** — Create and retrieve email templates.
- **Domains** — List, create, and delete sending domains.
- **Feeds** — Refresh product and data feeds.
- **Tracker Events** — Track custom subscriber events server-side.
- **Discount Coupons** — Import and delete coupon codes.
- **Webhooks** — Set, get, and delete webhook URL for campaign stats.

## Setup

1. Log in to your [Ecomail](https://ecomail.cz) account
2. Go to **Manage your account** > **For developers**
3. Click **Copy API Key**

## Usage

### Claude Code

```bash
claude mcp add ecomail -e ECOMAIL_API_KEY=your_api_key -- npx -y ecomail-mcp
```

### Cursor

Open the command palette and choose "Cursor Settings" > "MCP" > "Add new global MCP server".

```json
{
  "mcpServers": {
    "ecomail": {
      "command": "npx",
      "args": ["-y", "ecomail-mcp"],
      "env": {
        "ECOMAIL_API_KEY": "your_api_key"
      }
    }
  }
}
```

### Claude Desktop

Open Claude Desktop settings > "Developer" tab > "Edit Config".

```json
{
  "mcpServers": {
    "ecomail": {
      "command": "npx",
      "args": ["-y", "ecomail-mcp"],
      "env": {
        "ECOMAIL_API_KEY": "your_api_key"
      }
    }
  }
}
```

### Options

- `--key`: Your Ecomail API key (alternative to `ECOMAIL_API_KEY` env var)

Environment variables:

- `ECOMAIL_API_KEY`: Your Ecomail API key (required)

## Available Tools

### Lists

| Tool | Description |
|------|-------------|
| `list-lists` | View all subscriber lists |
| `create-list` | Create a new subscriber list |
| `get-list` | Show list detail with custom fields, groups, segments, and subscriber counts |
| `update-list` | Update an existing list |
| `get-subscribers` | Get paginated subscribers from a list |
| `get-subscriber-from-list` | Get a subscriber by email from a list |
| `get-subscriber-by-phone` | Get a subscriber by phone from a list |
| `subscribe` | Add a new subscriber to a list |
| `subscribe-bulk` | Add up to 3000 subscribers at once |
| `unsubscribe` | Unsubscribe from a list |
| `update-subscriber` | Update subscriber data in a list |
| `get-segments` | Get all segments for a list |

### Subscribers

| Tool | Description |
|------|-------------|
| `get-subscriber` | Get subscriber details globally across all lists |
| `delete-subscriber` | Permanently delete a subscriber |
| `find-contact` | Search for a subscriber by email across the account |

### Campaigns

| Tool | Description |
|------|-------------|
| `list-campaigns` | List campaigns with filtering |
| `create-campaign` | Create a new campaign (draft) |
| `get-campaign` | Get campaign detail with stats |
| `update-campaign` | Update a draft campaign |
| `send-campaign` | Queue campaign for immediate sending |
| `get-campaign-stats` | Get aggregate campaign statistics |
| `get-campaign-stats-detail` | Get per-subscriber campaign statistics |
| `get-segment-stats` | Get segment performance across campaigns |

### Automations

| Tool | Description |
|------|-------------|
| `list-automations` | List all automations |
| `trigger-automation` | Trigger automation for a subscriber |
| `get-automation-stats` | Get aggregate automation statistics |
| `get-automation-stats-detail` | Get per-subscriber automation statistics |
| `get-automation-stats-emails` | Get stats for specific emails in an automation |

### Transactional Emails

| Tool | Description |
|------|-------------|
| `send-transactional-email` | Send transactional email with custom content |
| `send-transactional-template` | Send transactional email using a template |
| `get-transactional-stats` | Get transactional email stats (6 months) |
| `get-doi-stats` | Get double opt-in email stats (6 months) |

### Transactions

| Tool | Description |
|------|-------------|
| `create-transaction` | Create an e-commerce transaction |
| `create-bulk-transactions` | Create up to 1000 transactions at once |
| `get-transactions` | Get paginated transactions with filters |
| `update-transaction` | Overwrite an existing transaction |
| `delete-transaction` | Delete a transaction by order ID |
| `delete-bulk-transactions` | Delete up to 1000 transactions at once |

### Templates

| Tool | Description |
|------|-------------|
| `create-template` | Create a new email template |
| `get-template` | Get template by ID with HTML content |

### Domains

| Tool | Description |
|------|-------------|
| `list-domains` | List all domains |
| `create-domain` | Add a new domain |
| `delete-domain` | Remove a domain |

### Feeds

| Tool | Description |
|------|-------------|
| `refresh-product-feed` | Trigger product feed refresh |
| `refresh-data-feed` | Trigger data feed refresh |

### Tracker Events

| Tool | Description |
|------|-------------|
| `create-event` | Track a custom event for a subscriber |

### Discount Coupons

| Tool | Description |
|------|-------------|
| `import-coupons` | Import coupon codes |
| `delete-coupons` | Delete coupon codes |

### Webhooks

| Tool | Description |
|------|-------------|
| `set-webhook-url` | Set webhook URL for campaign stats |
| `get-webhook-url` | Get current webhook URL |
| `delete-webhook-url` | Remove webhook URL |

## Local Development

1. Clone and build:

```bash
git clone <repo-url>
cd ecomail-mcp
pnpm install
pnpm run build
```

2. Use the local build in your MCP client:

```json
{
  "mcpServers": {
    "ecomail": {
      "command": "node",
      "args": ["ABSOLUTE_PATH_TO_PROJECT/dist/index.js"],
      "env": {
        "ECOMAIL_API_KEY": "your_api_key"
      }
    }
  }
}
```

### Testing with MCP Inspector

1. Set your API key:

   ```bash
   export ECOMAIL_API_KEY=your_key_here
   ```

2. Start the inspector:

   ```bash
   pnpm inspector
   ```

3. In the browser (Inspector UI):

   - Choose **stdio** (launch a process).
   - **Command:** `node`
   - **Args:** `dist/index.js`
   - **Env:** `ECOMAIL_API_KEY=your_key_here`
   - Click **Connect**, then use "List tools" to verify the server is working.

## Resources

- [Ecomail](https://ecomail.cz)
- [API Documentation](https://docs.ecomail.cz)

## License

MIT
