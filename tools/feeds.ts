import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { EcomailClient } from '../ecomail.js';

export function addFeedTools(server: McpServer, ecomail: EcomailClient) {
  server.registerTool(
    'refresh-product-feed',
    {
      title: 'Refresh Product Feed',
      description:
        'Trigger a refresh of a product feed. Limited to 1 refresh per hour. Requires Marketer+ account and feeds with fewer than 50,000 products.',
      inputSchema: {
        feed_id: z.number().describe('Product feed ID'),
      },
    },
    async ({ feed_id }) => {
      const response = await ecomail.get<any>(`/feeds/${feed_id}/refresh`);

      return {
        content: [
          {
            type: 'text',
            text: response.message || 'Product feed refresh triggered.',
          },
        ],
      };
    },
  );

  server.registerTool(
    'refresh-data-feed',
    {
      title: 'Refresh Data Feed',
      description:
        'Trigger a refresh of a data feed. Limited to 1 refresh per hour. Requires Marketer+ account and feeds with fewer than 50,000 items.',
      inputSchema: {
        feed_id: z.number().describe('Data feed ID'),
      },
    },
    async ({ feed_id }) => {
      const response = await ecomail.get<any>(`/data-feeds/${feed_id}/refresh`);

      return {
        content: [
          {
            type: 'text',
            text: response.message || 'Data feed refresh triggered.',
          },
        ],
      };
    },
  );
}
