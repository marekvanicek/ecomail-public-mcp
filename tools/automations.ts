import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { EcomailClient } from '../ecomail.js';

export function addAutomationTools(server: McpServer, ecomail: EcomailClient) {
  server.registerTool(
    'list-automations',
    {
      title: 'List Automations',
      description:
        'Retrieve all automations (pipelines) in your Ecomail account.',
      inputSchema: {},
    },
    async () => {
      const response = await ecomail.get<any[]>('/pipelines');

      if (!response || response.length === 0) {
        return {
          content: [{ type: 'text', text: 'No automations found.' }],
        };
      }

      const list = response
        .map(
          (a) =>
            `- ID: ${a.id} | "${a.name}" | List: ${a.list_id} | Created: ${a.created_at} | Updated: ${a.updated_at}`,
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Found ${response.length} automation(s):\n\n${list}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'trigger-automation',
    {
      title: 'Trigger Automation',
      description: 'Run a specific automation for a given subscriber email.',
      inputSchema: {
        automation_id: z.number().describe('Automation ID'),
        email: z.email().describe("Subscriber's email address"),
      },
    },
    async ({ automation_id, email }) => {
      const response = await ecomail.post<any>(
        `/pipelines/${automation_id}/trigger`,
        { email },
      );

      return {
        content: [
          {
            type: 'text',
            text: `Automation ${automation_id} triggered for ${response.email}.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'get-automation-stats',
    {
      title: 'Get Automation Stats',
      description: 'Retrieve aggregate statistics for a specific automation.',
      inputSchema: {
        automation_id: z.number().describe('Automation ID'),
      },
    },
    async ({ automation_id }) => {
      const response = await ecomail.get<any>(
        `/pipelines/${automation_id}/stats`,
      );

      const s = response.stats;
      let text = `Automation ${automation_id} Statistics:\n`;
      text += `  Triggered: ${s.triggered}\n`;
      text += `  Ended: ${s.ended}\n`;
      text += `  Sent: ${s.send}\n`;
      text += `  Injected: ${s.inject}\n`;
      text += `  Opens: ${s.open} (total: ${s.total_open})\n`;
      text += `  Open Rate: ${s.open_rate}%\n`;
      text += `  Not Opened: ${s.not_opened}\n`;
      text += `  Clicks: ${s.click} (total: ${s.total_click})\n`;
      text += `  Click Rate: ${s.click_rate}%\n`;
      text += `  Delivery Rate: ${s.delivery_rate}%\n`;
      text += `  Bounces: ${s.bounce} (soft: ${s.soft_bounce}, hard: ${s.hard_bounce}) - ${s.bounce_rate}%\n`;
      text += `  Spam: ${s.spam}\n`;
      text += `  Unsubscribes: ${s.unsub}\n`;
      text += `  Conversions: ${s.conversions} (value: ${s.conversions_value})`;

      return { content: [{ type: 'text', text }] };
    },
  );

  server.registerTool(
    'get-automation-stats-detail',
    {
      title: 'Get Automation Stats Detail',
      description: 'Get per-subscriber statistics for an automation.',
      inputSchema: {
        automation_id: z.number().describe('Automation ID'),
        type: z
          .enum([
            'open',
            'send',
            'unsub',
            'soft_bounce',
            'click',
            'hard_bounce',
            'out_of_band',
            'spam',
          ])
          .optional()
          .describe('Filter by event type'),
        email: z.string().optional().describe('Filter by email'),
        from: z
          .string()
          .optional()
          .describe('Filter from date (YYYY-MM-DD, UTC)'),
        per_page: z
          .number()
          .max(100)
          .optional()
          .describe('Results per page (max 100)'),
        page: z.number().optional().describe('Page number'),
      },
    },
    async ({ automation_id, ...params }) => {
      const query: Record<string, string | number | undefined> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) query[k] = v;
      }

      const response = await ecomail.get<any>(
        `/pipelines/${automation_id}/stats-detail`,
        query,
      );

      if (
        !response.subscribers ||
        Object.keys(response.subscribers).length === 0
      ) {
        return {
          content: [
            {
              type: 'text',
              text: 'No detailed stats found for this automation.',
            },
          ],
        };
      }

      const subStats = Object.entries(response.subscribers)
        .map(([email, stats]: [string, any]) => {
          const parts = Object.entries(stats)
            .filter(([, v]) => (v as number) > 0)
            .map(([k, v]) => `${k}: ${v}`);
          return `- ${email}: ${parts.join(', ') || 'no events'}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Automation ${automation_id} Detail Stats (total: ${response.total}):\n\n${subStats}${response.next_page_url ? '\n\nMore pages available.' : ''}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'get-automation-stats-emails',
    {
      title: 'Get Automation Stats for Emails',
      description:
        'Fetch engagement statistics for multiple email addresses in an automation.',
      inputSchema: {
        automation_id: z.number().describe('Automation ID'),
        emails: z.array(z.email()).min(1).describe('Array of email addresses'),
        per_page: z
          .number()
          .max(100)
          .optional()
          .describe('Results per page (max 100)'),
        page: z.number().optional().describe('Page number'),
      },
    },
    async ({ automation_id, emails, per_page, page }) => {
      const query: Record<string, string | number | string[] | undefined> = {
        emails,
      };
      if (per_page) query.per_page = per_page;
      if (page) query.page = page;

      const response = await ecomail.get<any>(
        `/pipelines/${automation_id}/stats-detail`,
        query,
      );

      if (
        !response.subscribers ||
        Object.keys(response.subscribers).length === 0
      ) {
        return {
          content: [
            {
              type: 'text',
              text: 'No stats found for the provided emails.',
            },
          ],
        };
      }

      const subStats = Object.entries(response.subscribers)
        .map(([email, stats]: [string, any]) => {
          const parts = Object.entries(stats)
            .filter(([, v]) => (v as number) > 0)
            .map(([k, v]) => `${k}: ${v}`);
          return `- ${email}: ${parts.join(', ') || 'no events'}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Automation ${automation_id} Stats for ${emails.length} email(s):\n\n${subStats}`,
          },
        ],
      };
    },
  );
}
