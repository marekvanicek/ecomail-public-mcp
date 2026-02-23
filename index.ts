#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import minimist from 'minimist';
import { EcomailClient } from './ecomail.js';
import packageJson from './package.json' with { type: 'json' };
import {
  addAutomationTools,
  addCampaignTools,
  addCouponTools,
  addDomainTools,
  addFeedTools,
  addListTools,
  addSubscriberTools,
  addTemplateTools,
  addTrackerTools,
  addTransactionalTools,
  addTransactionTools,
  addWebhookTools,
} from './tools/index.js';

const argv = minimist(process.argv.slice(2));

const apiKey = argv.key || process.env.ECOMAIL_API_KEY;

if (!apiKey) {
  console.error(
    'No API key provided. Please set ECOMAIL_API_KEY environment variable or use --key argument',
  );
  process.exit(1);
}

const ecomail = new EcomailClient(apiKey);

const server = new McpServer({
  name: 'ecomail',
  version: packageJson.version,
});

addListTools(server, ecomail);
addSubscriberTools(server, ecomail);
addCampaignTools(server, ecomail);
addAutomationTools(server, ecomail);
addTransactionalTools(server, ecomail);
addTransactionTools(server, ecomail);
addTemplateTools(server, ecomail);
addDomainTools(server, ecomail);
addFeedTools(server, ecomail);
addTrackerTools(server, ecomail);
addCouponTools(server, ecomail);
addWebhookTools(server, ecomail);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Ecomail MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
