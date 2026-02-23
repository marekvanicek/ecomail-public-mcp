import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { EcomailClient } from '../ecomail.js';

export function addSubscriberTools(server: McpServer, ecomail: EcomailClient) {
  server.registerTool(
    'get-subscriber',
    {
      title: 'Get Subscriber',
      description:
        'Get subscriber details globally across all lists in the account by email.',
      inputSchema: {
        email: z.email().describe("Subscriber's email address"),
      },
    },
    async ({ email }) => {
      const response = await ecomail.get<any>(
        `/subscribers/${encodeURIComponent(email)}`,
      );

      const s = response.subscriber;
      let details = `Subscriber: ${s.email}\n`;
      details += `Name: ${s.name || ''} ${s.surname || ''}\n`;
      details += `Gender: ${s.gender || 'N/A'}\n`;
      details += `Country: ${s.country || 'N/A'}\n`;
      details += `Rating: ${s.rating ?? 'N/A'}\n`;
      details += `Soft Bounces: ${s.bounce_soft}\n`;
      details += `Hard Bounces: ${s.bounced_hard}\n`;
      details += `Inserted: ${s.inserted_at}\n`;

      if (s.tags && s.tags.length > 0) {
        details += `Tags: ${s.tags.join(', ')}\n`;
      }

      if (s.lists && Object.keys(s.lists).length > 0) {
        details += `\nList Memberships:\n`;
        for (const [listId, membership] of Object.entries(s.lists) as [
          string,
          any,
        ][]) {
          details += `  - List ${listId}: status ${membership.status}, subscribed ${membership.subscribed_at}, source: ${membership.source}\n`;
        }
      }

      return { content: [{ type: 'text', text: details }] };
    },
  );

  server.registerTool(
    'delete-subscriber',
    {
      title: 'Delete Subscriber',
      description:
        'Permanently delete a subscriber from the database. Before using this tool, you MUST confirm with the user that they want to permanently delete this subscriber. This action is irreversible.',
      inputSchema: {
        email: z.email().describe('Email of the subscriber to delete'),
      },
    },
    async ({ email }) => {
      await ecomail.delete<any>(
        `/subscribers/${encodeURIComponent(email)}/delete`,
      );

      return {
        content: [
          {
            type: 'text',
            text: `Subscriber "${email}" permanently deleted.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'find-contact',
    {
      title: 'Find Contact',
      description:
        'Search for a subscriber globally across the account by email address. Returns all list memberships.',
      inputSchema: {
        email: z.email().describe('Email address to search for'),
      },
    },
    async ({ email }) => {
      const response = await ecomail.post<any[]>('/search', {
        query: email,
      });

      if (!response || response.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No contact found for "${email}".`,
            },
          ],
        };
      }

      const results = response
        .map(
          (r) =>
            `- List ${r.list_id}: ${r.name || ''} ${r.surname || ''} | Status: ${r.status} | Source: ${r.source} | Subscribed: ${r.subscribed_at}${r.unsubscribed_at ? ` | Unsubscribed: ${r.unsubscribed_at}` : ''}`,
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Found ${response.length} result(s) for "${email}":\n\n${results}`,
          },
        ],
      };
    },
  );
}
