import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { EcomailClient } from '../ecomail.js';

export function addWebhookTools(server: McpServer, ecomail: EcomailClient) {
  server.registerTool(
    'set-webhook-url',
    {
      title: 'Set Webhook URL',
      description:
        'Set the target webhook URL for campaign statistics. The webhook sends POST requests as JSON with a 10-second timeout.',
      inputSchema: {
        url: z.url().describe('Target webhook URL'),
      },
    },
    async ({ url }) => {
      await ecomail.post('/account/settings/webhook', { url });

      return {
        content: [
          {
            type: 'text',
            text: `Webhook URL set to: ${url}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'get-webhook-url',
    {
      title: 'Get Webhook URL',
      description: 'Get the currently configured webhook URL.',
      inputSchema: {},
    },
    async () => {
      const response = await ecomail.get<any>('/account/settings/webhook');

      const url = response.webhook?.url;
      return {
        content: [
          {
            type: 'text',
            text: url
              ? `Current webhook URL: ${url}`
              : 'No webhook URL configured.',
          },
        ],
      };
    },
  );

  server.registerTool(
    'delete-webhook-url',
    {
      title: 'Delete Webhook URL',
      description: 'Remove the currently configured webhook URL.',
      inputSchema: {},
    },
    async () => {
      await ecomail.delete('/account/settings/webhook');

      return {
        content: [
          {
            type: 'text',
            text: 'Webhook URL removed.',
          },
        ],
      };
    },
  );
}
