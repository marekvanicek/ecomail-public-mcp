import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { EcomailClient } from '../ecomail.js';

export function addTrackerTools(server: McpServer, ecomail: EcomailClient) {
  server.registerTool(
    'create-event',
    {
      title: 'Create Tracker Event',
      description:
        'Track a custom event for a subscriber. Supplements the JavaScript tracker for server-side event tracking.',
      inputSchema: {
        email: z.email().describe("Subscriber's email address"),
        category: z.string().describe('Event category'),
        action: z.string().describe('Event action'),
        label: z.string().optional().describe('Event label'),
        property: z.string().optional().describe('Event property'),
        value: z.string().optional().describe('Event value'),
      },
    },
    async ({ email, category, action, label, property, value }) => {
      const event: Record<string, unknown> = {
        email,
        category,
        action,
      };
      if (label) event.label = label;
      if (property) event.property = property;
      if (value) event.value = value;

      const response = await ecomail.post<any>('/tracker/events', {
        event,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Event tracked!\nID: ${response.id}\nEmail: ${response.email}\nCategory: ${response.category}\nAction: ${response.action}`,
          },
        ],
      };
    },
  );
}
